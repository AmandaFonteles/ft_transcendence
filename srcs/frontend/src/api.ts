// [CONCEPT: helper API] Centralise tous les appels HTTP vers le backend.
// Pourquoi un fichier a part : App.tsx reste concentre sur l'affichage,
// et on evite de repeter "credentials: include" ou le header Authorization partout.

export type AuthUser = {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

type TokenResponse = { accessToken: string }

// Petit wrapper : lance une requete JSON et transforme un statut d'erreur HTTP
// en exception JS exploitable avec un try/catch cote appelant.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    // ESSENTIEL : sans ca, le cookie httpOnly du refresh token ne part JAMAIS
    // et le navigateur ignore aussi le Set-Cookie renvoye par le backend.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  if (!res.ok) {
    // Le backend Nest renvoie { message: "..." } sur les erreurs (ConflictException etc.).
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Erreur HTTP ${res.status}`)
  }

  return res.json()
}

export function signup(data: { email: string; password: string; displayName: string }) {
  return request<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// MODIFIE : login() accepte maintenant un totpCode optionnel.
export function login(data: { email: string; password: string; totpCode?: string }) {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Utilise le cookie refreshToken (envoye automatiquement par le navigateur)
// pour obtenir un nouvel access token, sans redemander email/password.
export function refresh() {
  return request<TokenResponse>('/auth/refresh', { method: 'POST' })
}

export function logout() {
  return request<{ success: boolean }>('/auth/logout', { method: 'POST' })
}

// Necessite l'access token en cours : on le passe explicitement (il vit dans le
// state React de App.tsx, pas dans ce fichier, pour rester visible/controlable).
export function me(accessToken: string) {
  return request<AuthUser>('/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

// AJOUT : recupere la liste des avatars disponibles. Route publique, pas besoin
// de token — appelable meme depuis un formulaire de signup si besoin plus tard.
export function fetchAvatarPresets() {
  return request<string[]>('/users/avatar-presets')
}

// AJOUT : change l'avatar du user connecte. Necessite l'access token, comme me().
// Renvoie le user complet mis a jour (avatarUrl inclus).
export function selectAvatar(accessToken: string, avatarUrl: string) {
  return request<AuthUser>('/users/me/avatar', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ avatarUrl })
  })
}

// AJOUT : modifie displayName et/ou email. Les deux champs sont optionnels dans
// le body : n'envoie que ce qui a reellement change.
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

// AJOUT : change le mot de passe. Renvoie juste { success: true }, pas un user.
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

// AJOUT : lance l'activation, renvoie le QR code a afficher.
export function setupTwoFactor(accessToken: string) {
  return request<{ qrCodeDataUrl: string }>('/auth/2fa/setup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}

// AJOUT : confirme le premier code, active reellement la 2FA.
export function confirmTwoFactor(accessToken: string, totpCode: string) {
  return request<{ success: boolean }>('/auth/2fa/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ totpCode })
  })
}

// AJOUT : desactive la 2FA.
export function disableTwoFactor(accessToken: string) {
  return request<{ success: boolean }>('/auth/2fa/disable', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  })
}


// =============================================================================
// AJOUT NY : projets (Organization) et taches (Task).
// VOCABULAIRE : le backend nomme "Organization" ce que l'interface appelle
// "projet". On garde le nom backend dans les types (fidelite a l'API) et on
// traduit uniquement a l'affichage.
// =============================================================================

// Politique d'invitation : qui peut ajouter un membre au projet.
export type InvitePolicy = 'ADMIN_ONLY' | 'ANY_MEMBER'

// Statut d'une tache, tel que defini par l'enum Prisma TaskStatus.
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE'

// Forme renvoyee par l'API pour un projet (aucun include cote backend :
// ni membres ni taches ne sont joints, il faut les demander separement).
export type Organization = {
  id: string
  name: string
  description: string | null
  invitePolicy: InvitePolicy
  createdAt: string
  updatedAt: string
}

// Forme renvoyee par l'API pour une tache (idem : pas d'include).
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

// [CONCEPT: routes protegees] Toutes les routes ci-dessous exigent le jeton
// d'acces. On construit donc l'en-tete Authorization au meme endroit plutot que
// de le repeter dans chaque fonction.
function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` }
}

// --- Utilisateurs ------------------------------------------------------------

// [SECURITE] Forme renvoyee par l'annuaire. L'ADRESSE E-MAIL EN EST ABSENTE :
// le backend ne la renvoie plus (liste blanche de champs dans users.service.findAll).
// C'est une donnee personnelle dont l'annuaire n'a pas besoin.
export type PublicUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  isOnline?: boolean // AJOUT : présent sur les réponses /friendship/*, absent de /users
}

// Liste les utilisateurs connus (page Equipe). Route PROTEGEE : jeton obligatoire.
export function listUsers(accessToken: string) {
  return request<PublicUser[]>('/users', { headers: auth(accessToken) })
}

// --- Projets -----------------------------------------------------------------

// Projets dont l'utilisateur courant est membre actif (le backend filtre deja).
export function listOrganizations(accessToken: string) {
  return request<Organization[]>('/organizations', { headers: auth(accessToken) })
}

// Detail d'un projet. Le backend refuse (403) si on n'en est pas membre actif.
export function getOrganization(accessToken: string, id: string) {
  return request<Organization>(`/organizations/${id}`, { headers: auth(accessToken) })
}

// [CONCEPT: reponse-enveloppe] Plusieurs routes ne renvoient PAS l'entite mais un
// accuse de reception : { message, xxxId }. Il faut typer ce qu'elles renvoient
// VRAIMENT, sinon le code lit des champs inexistants (undefined silencieux).
export type CreatedOrganization = { message: string; organizationId: string }
export type Ack = { message: string }
export type TaskAck = { message: string; taskId: string }

// Cree un projet ; le createur en devient automatiquement ADMIN.
// Renvoie { message, organizationId } et non l'objet Organization complet.
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

// Modifie un projet. Reserve aux ADMIN (le backend le verifie).
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

// Ajoute un membre au projet (soumis a la politique d'invitation).
export function addOrganizationMember(accessToken: string, id: string, userId: string) {
  return request<Ack>(`/organizations/${id}/members`, {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({ userId }),
  })
}

// Quitte un projet.
export function leaveOrganization(accessToken: string, id: string) {
  return request<Ack>(`/organizations/${id}/members/me`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

// --- Taches ------------------------------------------------------------------
// Les taches sont IMBRIQUEES sous un projet : /organizations/:id/tasks

// Liste les taches d'un projet.
// Filtres optionnels cote backend : owned, unassigned, assignedUserIds.
// Sans filtre, le backend renvoie ce que l'utilisateur a le droit de voir.
export function listTasks(
  accessToken: string,
  organizationId: string,
  filters?: { owned?: boolean; unassigned?: boolean; assignedUserIds?: string[] },
) {
  // URLSearchParams encode proprement les valeurs (espaces, accents...).
  const params = new URLSearchParams()
  if (filters?.owned !== undefined) params.set('owned', String(filters.owned))
  if (filters?.unassigned !== undefined) params.set('unassigned', String(filters.unassigned))
  // Le backend attend une liste separee par des virgules (voir le @Transform du DTO).
  if (filters?.assignedUserIds) params.set('assignedUserIds', filters.assignedUserIds.join(','))
  const qs = params.toString()
  return request<Task[]>(`/organizations/${organizationId}/tasks${qs ? `?${qs}` : ''}`, {
    headers: auth(accessToken),
  })
}

// Cree une tache dans un projet.
// assignToSelf vaut true par defaut cote backend : on l'expose pour pouvoir
// creer une tache non assignee.
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

// Change le statut d'une tache (NOT_STARTED / IN_PROGRESS / DONE).
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

// Modifie le contenu d'une tache (nom, description, dates).
// ATTENTION : renvoie { message, taskId }, PAS la tache mise a jour.
// L'appelant doit donc relire la tache avec getTask() s'il veut l'objet a jour.
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

// Supprime une tache.
export function deleteTask(accessToken: string, organizationId: string, taskId: string) {
  return request<TaskAck>(`/organizations/${organizationId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}


// --- Amitié --------------------------------------------------------------

export type FriendshipStatus = 'PENDING' | 'ACCEPTED'

// Un ami tel que renvoyé par GET /friendship : le backend a déjà résolu
// "l'autre" utilisateur (requester ou receiver selon qui a envoyé la demande).
export type Friend = {
  friendshipId: string
  user: PublicUser
}

// Une demande en attente (recue ou envoyee), avec l'autre utilisateur inclus.
export type FriendRequest = {
  id: string
  status: FriendshipStatus
  createdAt: string
  requester?: PublicUser
  receiver?: PublicUser
}

// Recherche d'utilisateurs par nom/identifiant, pour ajouter un ami.
// Distinct de listUsers() : celle-ci cible specifiquement /friendship/search
// (exclut deja soi-meme cote backend).
export function searchUsers(accessToken: string, query: string) {
  const params = new URLSearchParams({ q: query })
  return request<PublicUser[]>(`/friendship/search?${params.toString()}`, {
// --- Membres d'un projet -----------------------------------------------------
// Cette route existe desormais cote backend (findAllMembers) : la page projet peut
// enfin afficher les membres, leurs roles et le tag administrateur.

// Forme exacte renvoyee par GET /organizations/:id/members.
// Le backend selectionne volontairement peu de champs : ni e-mail ni date.
export type OrganizationMember = {
  role: 'ADMIN' | 'MEMBER'
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

// Liste les membres ACTIFS d'un projet (le backend exclut ceux qui l'ont quitte).
export function listOrganizationMembers(accessToken: string, organizationId: string) {
  return request<OrganizationMember[]>(`/organizations/${organizationId}/members`, {
    headers: auth(accessToken),
  })
}

// Liste des amis actuels (statut ACCEPTED, dans les deux sens).
export function listFriends(accessToken: string) {
  return request<Friend[]>('/friendship', { headers: auth(accessToken) })
}

// Demandes recues en attente (quelqu'un veut m'ajouter).
export function listPendingRequests(accessToken: string) {
  return request<FriendRequest[]>('/friendship/pending', { headers: auth(accessToken) })
}

// Demandes envoyees en attente (j'attends une reponse).
export function listSentRequests(accessToken: string) {
  return request<FriendRequest[]>('/friendship/sent', { headers: auth(accessToken) })
}

// Envoie une demande d'ami par username.
export function sendFriendRequest(accessToken: string, username: string) {
  return request<FriendRequest>('/friendship/request', {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({ username }),
  })
}

// Accepte une demande recue.
export function acceptFriendRequest(accessToken: string, friendshipId: string) {
  return request<FriendRequest>(`/friendship/${friendshipId}/accept`, {
// Promeut un membre en administrateur. Reserve aux administrateurs.
export function promoteMember(accessToken: string, organizationId: string, targetUserId: string) {
  return request<Ack>(`/organizations/${organizationId}/members/${targetUserId}/promote`, {
    method: 'PATCH',
    headers: auth(accessToken),
  })
}

// Meme route pour 3 usages : refuser une demande recue, annuler une demande
// envoyee, ou retirer un ami existant — le backend verifie juste qu'on fait
// partie de la relation.
export function removeFriendship(accessToken: string, friendshipId: string) {
  return request<{ success: boolean }>(`/friendship/${friendshipId}`, {
// Retrograde un administrateur en membre simple.
// Le backend refuse s'il s'agit du dernier administrateur du projet.
export function demoteMember(accessToken: string, organizationId: string, targetUserId: string) {
  return request<Ack>(`/organizations/${organizationId}/members/${targetUserId}/demote`, {
    method: 'PATCH',
    headers: auth(accessToken),
  })
}

// Exclut un membre du projet. Reserve aux administrateurs.
// Le backend interdit a un administrateur de s'exclure lui-meme (il doit "quitter").
export function removeMember(accessToken: string, organizationId: string, targetUserId: string) {
  return request<Ack>(`/organizations/${organizationId}/members/${targetUserId}`, {
    method: 'DELETE',
    headers: auth(accessToken),
  })
}

// --- Chat -------------------------------------------------------------------

// Forme d'un message tel que renvoyé par GET /organizations/:id/messages.
// L'auteur est enrichi de la relation OrganizationMember -> User côté backend.
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

// Historique des messages d'un projet. `before` sert a paginer en remontant
// dans le temps (createdAt du plus ancien message deja charge).
export function listMessages(accessToken: string, organizationId: string, before?: string) {
  const params = before ? `?before=${encodeURIComponent(before)}` : ''
  return request<ChatMessage[]>(`/organizations/${organizationId}/messages${params}`, {
    headers: auth(accessToken),
  })
}
// --- Relecture d'une tache ---------------------------------------------------

// Recharge une tache depuis l'API.
// Necessaire apres updateTask(), qui ne renvoie qu'un accuse de reception.
export function getTask(accessToken: string, organizationId: string, taskId: string) {
  return request<Task>(`/organizations/${organizationId}/tasks/${taskId}`, {
    headers: auth(accessToken),
  })
}
