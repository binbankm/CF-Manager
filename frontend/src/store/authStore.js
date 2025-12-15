import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * 认证状态管理
 */
export const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            // 登录
            login: (token, user) => {
                set({ token, user, isAuthenticated: true });
            },

            // 登出
            logout: () => {
                set({ token: null, user: null, isAuthenticated: false });
            },

            // 更新用户信息
            updateUser: (user) => {
                set({ user });
            }
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage)
        }
    )
);
