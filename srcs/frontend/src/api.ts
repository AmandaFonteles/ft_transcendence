// Centralise tous les appels HTTP vers le backend : les composants n'ont ainsi ni
// "credentials: include" ni en-tete Authorization a repeter.

// --- Authentification -------------------------------------------------------

export type AuthUser = {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  // Aplati par le backend depuis la relation Credential. Toujours false pour un
  // compte OAuth pur : sans mot de passe, pas de 2FA.
  twoFactorEnabled: boolean
}

type TokenResponse = { accessToken: string }

// --- Renouvellement transparent du jeton d'acces ----------------------------

// Le jeton d'acces vit 15 minutes (JWT_ACCESS_EXPIRES) alors que le cookie de
// rafraichissement vit 7 jours. Sans ce qui suit, un onglet laisse ouvert
// quinze minutes voyait TOUTES ses requetes echouer en 401 ("Unauthorized")
// jusqu'a un rechargement manuel de la page, alors que la session etait encore
// parfaitement valide cote serveur.

// L'AuthContext s'y abonne : un jeton pour le ranger dans l'etat React et dans
// le module socket, null quand le cookie lui-meme est expire (session finie).
type AccessTokenListener = (accessToken: string | null) => void

let accessTokenListener: AccessTokenListener | null = null

export function setAccessTokenListener(listener: AccessTokenListener | null): void {
  accessTokenListener = listener
}

// Un seul appel a /auth/refresh a la fois : une page qui lance dix requetes
// declencherait sinon dix rotations concurrentes du cookie, dont une seule
// survivrait.
let pendingRenewal: Promise<string | null> | null = null

function renewAccessToken(): Promise<string | null> {
  if (!pendingRenewal) {
    pendingRenewal = refresh()
      .then(({ accessToken }) => {
        accessTokenListener?.(accessToken)
        return accessToken
      })
      // Cookie absent ou expire : la session est bel et bien finie, on le dit a
      // l'AuthContext plutot que de laisser l'interface enchainer les erreurs.
      .catch(() => {
        accessTokenListener?.(null)
        return null
      })
      .finally(() => {
        pendingRenewal = null
      })
  }
  return pendingRenewal
}

// En-tetes en objet simple et non en HeadersInit : tout le fichier les ecrit
// deja ainsi, et send() doit pouvoir en relire un (Authorization) puis le
// remplacer, ce qu'un Headers ou un tableau de paires rendrait penible.
type ApiRequestInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

// Envoie la requete et, sur un 401 d'une requete authentifiee, renouvelle le
// jeton puis rejoue UNE fois. Renvoie la reponse brute : les appelants qui
// attendent autre chose que du JSON (blob, corps vide) passent aussi par ici.
export async function send(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) }

  // Pas de Content-Type impose sur un FormData : le navigateur doit y mettre
  // lui-meme la frontiere multipart.
  if (!(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const call = (sent: Record<string, string>) =>
    fetch(`/api${path}`, {
      ...init,
      // Sans ca, le cookie httpOnly du refresh token ne part jamais et le navigateur
      // ignore le Set-Cookie renvoye par le backend.
      credentials: 'include',
      headers: sent,
    })

  const res = await call(headers)

  // Un 401 sans en-tete Authorization n'a rien a voir avec un jeton expire : c'est
  // la reponse metier de /auth/login, /auth/refresh et /auth/logout, qui n'en
  // envoient pas. Ce test est donc aussi le garde-fou contre une recursion, en
  // empechant de rejouer /auth/refresh sur son propre echec.
  if (res.status !== 401 || !headers.Authorization) {
    return res
  }

  const renewed = await renewAccessToken()
  // Echec du renouvellement : on rend le 401 d'origine, avec son message.
  if (!renewed) return res

  return call({ ...headers, Authorization: `Bearer ${renewed}` })
}

// Erreur HTTP porteuse de son statut : uploadProjectFile a besoin de distinguer
// un 401 (jeton expire, on rejoue) du reste, ce qu'un Error nu ne permet pas.
type HttpError = Error & { status?: number }

function httpError(status: number, message?: string): HttpError {
  const error = new Error(message ?? `Erreur HTTP ${status}`) as HttpError
  error.status = status
  return error
}

// Statut d'une exception levee par request(), ou null quand l'echec ne vient pas
// d'une reponse HTTP (reseau coupe, corps illisible). Evite aux appelants de
// deviner le probleme en lisant le message, qui est redige par le backend.
export function httpStatusOf(error: unknown): number | null {
  return error instanceof Error ? ((error as HttpError).status ?? null) : null
}

// Transforme un statut d'erreur HTTP en exception exploitable par l'appelant.
async function request<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const res = await send(path, init)

  if (!res.ok) {
    // Nest renvoie { message: "..." } sur ses exceptions.
    const body = await res.json().catch(() => null)
    // httpError et non Error : le statut permet aux appelants de traiter
    // certains echecs autrement que comme une erreur a afficher (voir
    // TaskAssignees, qui ignore le 404 d'une tache supprimee entre-temps).
    throw httpError(res.status, body?.message)
  }

  return res.json()
}

export function signup(data: { email: string; password: string; displayName: string }) {
  return request<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export function login(data: { email: string; password: string; totpCode?: string }) {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export function refresh() {
  return request<TokenResponse>('/auth/refresh', { method: 'POST' })
}

export function logout() {
  return request<{ success: boolean }>('/auth/logout', { method: 'POST' })
}

// L'access token est passe explicitement : il vit dans le contexte React, pas ici.
export function me(accessToken: string) {
  return request<AuthUser>('/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

// --- Profil -----------------------------------------------------------------

export function fetchAvatarPresets() {
  return request<string[]>('/users/avatar-presets')
}

export function selectAvatar(accessToken: string, avatarUrl: string) {
  return request<AuthUser>('/users/me/avatar', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ avatarUrl })
  })
}

export function updateProfile(
  accessToken: string,
  data: { email?: string; displayName?: string }
) {
  return request<AuthUser>('/users/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data)
  })
}

export function changePassword(
  accessToken: string,
  data: { currentPassword: string; newPassword: string }
) {
  return request<{ success: boolean }>('/users/me/password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(data)
  })
}

// --- 2FA --------------------------------------------------------------------

export function setupTwoFactor(accessToken: string) {
  return request<{ qrCodeDataUrl: string }>('/auth/2fa/setup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

export function confirmTwoFactor(accessToken: string, totpCode: string) {
  return request<{ success: boolean }>('/auth/2fa/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ totpCode })
  })
}

export function disableTwoFactor(accessToken: string) {
  return request<{ success: boolean }>('/auth/2fa/disable', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

// --- Projets et taches : types ----------------------------------------------

// Le backend nomme "Organization" ce que l'interface appelle "projet" : on garde
// le nom backend dans les types et on ne traduit qu'a l'affichage.

export type InvitePolicy = 'ADMIN_ONLY' | 'ANY_MEMBER'

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE'

// Aucun include cote backend : ni membres ni taches ne sont joints, il faut les
// demander separement.
export type Organization = {
  id: string
  name: string
  description: string | null
  invitePolicy: InvitePolicy
  createdAt: string
  updatedAt: string
}

export type Task = {
  id: string
  name: string
  description: string | null
  status: TaskStatus
  startDate: string | null
  dueDate: string | null
  organizationId: string
  ownerId: string | null
  createdAt: string
  updatedAt: string
}

// --- Routes protegees -------------------------------------------------------

// Toutes les routes ci-dessous exigent le jeton d'acces : l'en-tete est construit
// ici plutot que repete dans chaque fonction.
function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

// --- Utilisateurs -----------------------------------------------------------

// L'adresse e-mail est absente : le backend ne la renvoie plus dans l'annuaire.
export type PublicUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  isOnline?: boolean
}

export function listUsers(accessToken: string) {
  return request<PublicUser[]>('/users', { headers: auth(accessToken) })
}

// --- Projets ----------------------------------------------------------------

export function listOrganizations(accessToken: string) {
  return request<Organization[]>('/organizations', { headers: auth(accessToken) })
}

export function getOrganization(accessToken: string, id: string) {
  return request<Organization>(`/organizations/${id}`, { headers: auth(accessToken) })
}

// Plusieurs routes ne renvoient pas l'entite mais un accuse de reception : il faut
// typer ce qu'elles renvoient vraiment, sinon on lit des champs inexistants.
export type CreatedOrganization = { message: string; organizationId: string }
export type Ack = { message: string }
export type TaskAck = { message: string; taskId: string }

export function createOrganization(
  accessToken: string,
  data: { name: string; description?: string; invitePolicy?: InvitePolicy },
) {
  return request<CreatedOrganization>('/organizations', {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify(data),
  })
}

export function updateOrganization(
  accessToken: string,
  id: string,
  data: { name?: string; description?: string; invitePolicy?: InvitePolicy },
) {
  return request<Ack>(`/organizations/${id}`, {
    method: 'PATCH',
    headers: auth(accessToken),
    body: JSON.stringify(data),
  })
}

// Cascade : entraine la suppression de toutes les taches, appartenances et
// fichiers du projet (voir schema.prisma).
export function deleteOrganization(accessToken: string, id: string) {
  return request<Ack>(`/organizations/${id}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

export function addOrganizationMember(accessToken: string, id: string, userId: string) {
  return request<Ack>(`/organizations/${id}/members`, {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({ userId }),
  })
}

export function leaveOrganization(accessToken: string, id: string) {
  return request<Ack>(`/organizations/${id}/members/me`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

// --- Taches (imbriquees sous un projet) -------------------------------------

export function listTasks(
  accessToken: string,
  organizationId: string,
  filters?: { owned?: boolean; unassigned?: boolean; assignedUserIds?: string[] },
) {
  const params = new URLSearchParams()
  if (filters?.owned !== undefined) params.set('owned', String(filters.owned))
  if (filters?.unassigned !== undefined) params.set('unassigned', String(filters.unassigned))
  if (filters?.assignedUserIds) params.set('assignedUserIds', filters.assignedUserIds.join(','))
  const qs = params.toString()
  return request<Task[]>(`/organizations/${organizationId}/tasks${qs ? `?${qs}` : ''}`, {
    headers: auth(accessToken),
  })
}

export function createTask(
  accessToken: string,
  organizationId: string,
  data: {
    name: string
    description?: string
    startDate?: string
    dueDate?: string
    assignToSelf?: boolean
  },
) {
  return request<Task>(`/organizations/${organizationId}/tasks`, {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify(data),
  })
}

export function updateTaskStatus(
  accessToken: string,
  organizationId: string,
  taskId: string,
  status: TaskStatus,
) {
  return request<Task>(`/organizations/${organizationId}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: auth(accessToken),
    body: JSON.stringify({ status }),
  })
}

// Renvoie { message, taskId }, pas la tache : relire avec getTask() si besoin.
export function updateTask(
  accessToken: string,
  organizationId: string,
  taskId: string,
  data: { name?: string; description?: string | null; startDate?: string | null; dueDate?: string | null },
) {
  return request<TaskAck>(`/organizations/${organizationId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: auth(accessToken),
    body: JSON.stringify(data),
  })
}

// --- Assignations de taches -------------------------------------------------

// "member" est un OrganizationMember, pas un User : il porte userId, pas
// displayName. Croiser avec listOrganizationMembers pour afficher un nom.
export type TaskAssignment = {
  taskId: string
  memberId: string
  member: {
    id: string
    userId: string
    organizationId: string
    role: 'ADMIN' | 'MEMBER'
  }
}

export function listTaskAssignments(accessToken: string, organizationId: string, taskId: string) {
  return request<TaskAssignment[]>(
    `/organizations/${organizationId}/tasks/${taskId}/assignments`,
    { headers: auth(accessToken) },
  )
}

// Regles backend : le proprietaire de la tache et les administrateurs peuvent
// assigner n'importe qui ; tout autre membre ne peut s'assigner que lui-meme, et
// seulement si la tache n'a encore aucun assigne.
export function assignTaskMember(
  accessToken: string, organizationId: string, taskId: string, memberUserId: string,
) {
  return request<TaskAck>(`/organizations/${organizationId}/tasks/${taskId}/assignments`, {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({ memberUserId }),
  })
}

// Regles backend : le proprietaire et les administrateurs peuvent retirer
// n'importe qui ; les autres ne peuvent retirer qu'eux-memes.
export function removeTaskAssignment(
  accessToken: string, organizationId: string, taskId: string, memberUserId: string,
) {
  return request<TaskAck>(
    `/organizations/${organizationId}/tasks/${taskId}/assignments/${memberUserId}`,
    { method: 'DELETE', headers: auth(accessToken) },
  )
}

export function deleteTask(accessToken: string, organizationId: string, taskId: string) {
  return request<TaskAck>(`/organizations/${organizationId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

// --- Amities ----------------------------------------------------------------

export type FriendshipStatus = 'PENDING' | 'ACCEPTED'

// Le backend a deja resolu "l'autre" utilisateur (requester ou receiver selon
// qui a envoye la demande).
export type Friend = {
  friendshipId: string
  user: PublicUser
}

export type FriendRequest = {
  id: string
  status: FriendshipStatus
  createdAt: string
  requester?: PublicUser
  receiver?: PublicUser
}

// Distinct de listUsers() : cible /friendship/search, qui exclut deja soi-meme.
export function searchUsers(accessToken: string, query: string) {
  const params = new URLSearchParams({ q: query })
  return request<PublicUser[]>(`/friendship/search?${params.toString()}`, {
    headers: auth(accessToken),
  })
}

// --- Membres d'un projet ----------------------------------------------------

// Le backend selectionne volontairement peu de champs : ni e-mail ni date.
export type OrganizationMember = {
  id: string
  role: 'ADMIN' | 'MEMBER'
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

export function listOrganizationMembers(accessToken: string, organizationId: string) {
  return request<OrganizationMember[]>(`/organizations/${organizationId}/members`, {
    headers: auth(accessToken),
  })
}

export function listFriends(accessToken: string) {
  return request<Friend[]>('/friendship', { headers: auth(accessToken) })
}

export function listPendingRequests(accessToken: string) {
  return request<FriendRequest[]>('/friendship/pending', { headers: auth(accessToken) })
}

export function listSentRequests(accessToken: string) {
  return request<FriendRequest[]>('/friendship/sent', { headers: auth(accessToken) })
}

export function sendFriendRequest(accessToken: string, username: string) {
  return request<FriendRequest>('/friendship/request', {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({ username }),
  })
}

export function acceptFriendRequest(accessToken: string, friendshipId: string) {
  return request<FriendRequest>(`/friendship/${friendshipId}/accept`, {
    method: 'PATCH',
    headers: auth(accessToken),
  })
}
export function promoteMember(accessToken: string, organizationId: string, targetUserId: string) {
  return request<Ack>(`/organizations/${organizationId}/members/${targetUserId}/promote`, {
    method: 'PATCH',
    headers: auth(accessToken),
  })
}

// Meme route pour trois usages : refuser une demande recue, annuler une demande
// envoyee, ou retirer un ami existant.
export function removeFriendship(accessToken: string, friendshipId: string) {
  return request<{ success: boolean }>(`/friendship/${friendshipId}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}
// Le backend refuse s'il s'agit du dernier administrateur du projet.
export function demoteMember(accessToken: string, organizationId: string, targetUserId: string) {
  return request<Ack>(`/organizations/${organizationId}/members/${targetUserId}/demote`, {
    method: 'PATCH',
    headers: auth(accessToken),
  })
}

// Le backend interdit a un administrateur de s'exclure lui-meme (il doit "quitter").
export function removeMember(accessToken: string, organizationId: string, targetUserId: string) {
  return request<Ack>(`/organizations/${organizationId}/members/${targetUserId}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

// --- Chat -------------------------------------------------------------------

export type ChatMessage = {
  id: string
  content: string
  createdAt: string
  organizationId: string
  authorId: string
  author: {
    user: PublicUser
  }
}

// `before` pagine en remontant dans le temps (createdAt du plus ancien message
// deja charge).
export function listMessages(accessToken: string, organizationId: string, before?: string) {
  const params = before ? `?before=${encodeURIComponent(before)}` : ''
  return request<ChatMessage[]>(`/organizations/${organizationId}/messages${params}`, {
    headers: auth(accessToken),
  })
}

// Recharge une tache : necessaire apres updateTask(), qui ne renvoie qu'un accuse.
export function getTask(accessToken: string, organizationId: string, taskId: string) {
  return request<Task>(`/organizations/${organizationId}/tasks/${taskId}`, {
    headers: auth(accessToken),
  })
}

export function deleteAccount(accessToken: string) {
  return request<{ success: boolean }>('/users/me', {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

// --- Fichiers de projet -----------------------------------------------------

export type VisibilityPolicy = 'PRIVATE' | 'RESTRICTED' | 'ALL_MEMBERS'

export type ProjectFile = {
  id: string
  name: string
  description: string | null
  mimeType: string
  size: number
  storagePath: string
  visibilityPolicy: VisibilityPolicy
  createdAt: string
  updatedAt: string
  organizationId: string
  ownerId: string | null
}

export type ProjectFileAccess = {
  id: string
  member: {
    userId: string
    leftAt: string | null
    user: {
      id: string
      displayName: string
      avatarUrl: string | null
    }
  }
}

// XMLHttpRequest et non fetch : c'est le seul moyen de suivre la progression de
// l'ENVOI, que fetch() ne sait pas rapporter. Contrepartie : ce chemin ne passe
// pas par send(), le renouvellement du jeton sur 401 est donc refait ici.
export function uploadProjectFile(accessToken: string, organizationId: string, file: File, onProgress?: (percent: number) => void) {
  const attempt = (token: string) =>
    new Promise<ProjectFile>((resolve, reject) => {
      const formData = new FormData()

      formData.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open(`POST`, `/api/organizations/${organizationId}/files`)
      xhr.setRequestHeader( 'Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress?.(percent)
        }
      }
      xhr.onload = () => {
        if(xhr.status >= 200 && xhr.status < 300)
        {
          const uploadedFile = JSON.parse(xhr.responseText) as ProjectFile
          resolve(uploadedFile)
        } else
        {
          // Le corps d'erreur n'est pas toujours du JSON (une 413 rendue par
          // nginx est du HTML) : sans ce try, l'exception de JSON.parse partirait
          // dans le vide et la promesse ne se resoudrait jamais.
          let message: string | undefined
          try {
            message = JSON.parse(xhr.responseText)?.message
          } catch {
            message = undefined
          }
          reject(httpError(xhr.status, message))
        }
      }
      xhr.onerror = () => {
        reject(new Error(`Erreur réseau pendant l’envoi du fichier`))
      }
      xhr.send(formData)
    })

  return attempt(accessToken).catch(async (error: HttpError) => {
    if (error.status !== 401) throw error
    const renewed = await renewAccessToken()
    if (!renewed) throw error
    // Le fichier repart du debut : la barre doit repartir de zero elle aussi.
    onProgress?.(0)
    return attempt(renewed)
  })
}

export function listProjectFiles(accessToken: string, organizationId: string) {
  return request<ProjectFile[]>(
    `/organizations/${organizationId}/files`,
    { headers: auth(accessToken) }
  )
}

export async function downloadProjectFile(accessToken: string, organizationId: string, fileId: string ) {
  const res = await send(
    `/organizations/${organizationId}/files/${fileId}/download`,
    {
      headers: auth(accessToken)
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Erreur HTTP ${res.status}`)
  }

  return res.blob()
}

// Reserve au proprietaire du fichier et aux ADMIN du projet. La route repond
// l'identifiant en texte brut, pas du JSON : on ne parse pas le corps en cas de succes.
export async function deleteProjectFile(
  accessToken: string, organizationId: string, fileId: string,
) {
  const res = await send(`/organizations/${organizationId}/files/${fileId}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Erreur HTTP ${res.status}`)
  }
}

export async function previewProjectFile(
  accessToken: string, organizationId: string, fileId: string,
) {
  const res = await send(
    `/organizations/${organizationId}/files/${fileId}/preview`,
    {
      headers: auth(accessToken),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Erreur HTTP ${res.status}`)
  }

  return res.blob()
}

export function updateProjectFile(
  accessToken: string,
  organizationId: string,
  fileId: string,
  data: {
    name?: string
    description?: string
    visibilityPolicy?: VisibilityPolicy
  },
) {
  return request<ProjectFile>(
    `/organizations/${organizationId}/files/${fileId}`,
    {
      method: 'PATCH',
      headers: auth(accessToken),
      body: JSON.stringify(data),
    }
  )
}

export async function uploadAvatar(accessToken: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await send('/users/me/avatar/upload', {
    method: 'PATCH',
    headers: auth(accessToken),
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Erreur HTTP ${res.status}`)
  }

  return res.json() as Promise<AuthUser>
}

export function listProjectFileAccesses( accessToken: string, organizationId: string, fileId: string, ) {
  return request<ProjectFileAccess[]>(
    `/organizations/${organizationId}/files/${fileId}/access`,
    {
      headers: auth(accessToken),
    }
  )
}

export async function addProjectFileAccess( accessToken: string, organizationId: string, fileId: string, targetUserId: string ) {
  const res = await send(
    `/organizations/${organizationId}/files/${fileId}/access/${targetUserId}`,
    {
      method: 'POST',
      headers: auth(accessToken),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Erreur HTTP ${res.status}`)
  }
}

export async function removeProjectFileAccess( accessToken: string, organizationId: string, fileId: string, targetUserId: string ) {
  const res = await send(
    `/organizations/${organizationId}/files/${fileId}/access/${targetUserId}`,
    {
      method: 'DELETE',
      headers: auth(accessToken),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    // httpError et non Error : FilesSection distingue le 404 (affichage perime,
    // a resynchroniser) des autres echecs, qui sont de vraies erreurs.
    throw httpError(res.status, body?.message)
  }
  // Pas de res.json() ici : la route repond par l'identifiant du fichier en
  // texte brut, pas en JSON, et le parser levait "JSON.parse: unexpected
  // character" alors meme que la suppression avait reussi. Le cast en AuthUser
  // venait d'un copier-coller depuis l'envoi d'avatar juste au-dessus.
  // addProjectFileAccess, symetrique, ne lit deja rien.
}
