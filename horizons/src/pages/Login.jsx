import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Helmet } from 'react-helmet';
// 🔥 التعديل هنا
import { logSystemActivity } from '@/utils/omarTools'; 

const LoginPage = () => {
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { data, error } = await signIn(email, password);
        if (!error && data?.user) {
            logSystemActivity(data.user.id, 'LOGIN', 'SYSTEM', { message: 'تم تسجيل الدخول بنجاح' });
            navigate('/');
        }
        setLoading(false);
    };

    return (
        <>
            <Helmet><title>تسجيل الدخول</title></Helmet>
            <div className="min-h-screen flex items-center justify-center bg-slate-900/90">
                <Card className="w-full max-w-md border-0 shadow-xl bg-white/95">
                    <CardHeader className="text-center pb-2 pt-8">
                        <h1 className="text-2xl font-bold">مرحباً بك مجدداً</h1>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <Button type="submit" className="w-full bg-slate-900" disabled={loading}>
                                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};
export default LoginPage;