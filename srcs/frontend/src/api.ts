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


