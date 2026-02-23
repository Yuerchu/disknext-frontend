import { useAdminStore } from '../stores/admin'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/user'

export function clearSessionStores() {
  const auth = useAuthStore()
  const user = useUserStore()
  const admin = useAdminStore()

  auth.logout()
  user.clear()
  admin.reset()
}
