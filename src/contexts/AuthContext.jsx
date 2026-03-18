import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const saved = localStorage.getItem('lms_user')
        if (saved) {
            setUser(JSON.parse(saved))
        }
        setLoading(false)
    }, [])

    const login = async (username, password) => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .or(`email.eq.${username},employeeId.eq.${username}`)
                .eq('password', password)
                
            if (error) throw error

            if (users && users.length > 0) {
                const foundUser = users[0]
                setUser(foundUser)
                localStorage.setItem('lms_user', JSON.stringify(foundUser))
                return { success: true, user: foundUser }
            }
            return { success: false, error: 'รหัสพนักงาน/อีเมล หรือรหัสผ่านไม่ถูกต้อง' }
        } catch (err) {
            console.error(err)
            return { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('lms_user')
    }

    const updateUser = (newData) => {
        const updatedUser = { ...user, ...newData }
        setUser(updatedUser)
        localStorage.setItem('lms_user', JSON.stringify(updatedUser))
    }

    const isAdmin = user?.role === 'admin'
    const isStudent = user?.role === 'student'

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading, isAdmin, isStudent }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
