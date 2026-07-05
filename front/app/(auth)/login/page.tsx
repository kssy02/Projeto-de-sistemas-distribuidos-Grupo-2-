'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

const GOOGLE_CLIENT_ID = "530069875129-l9o61rops10vi0vb9q8ur9ijqcgmbnbs.apps.googleusercontent.com";

interface GoogleJwtPayload {
  sub: string; // 💡 ID único do usuário fornecido pelo Google
  name: string;
  email: string;
  picture: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('googleButton'),
          { theme: 'outline', size: 'large', width: 380, text: 'signin_with' }
        );
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 🔄 Função auxiliar para cadastrar/atualizar o usuário no Postgres
  const sincronizarUsuarioNoBanco = async (dadosUser: { id: string, nome: string, email: string, avatar_url: string }) => {
    try {
      const res = await fetch('/api-proxy/usuarios/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosUser),
      });
      if (!res.ok) {
        console.error("Aviso: Falha ao sincronizar registro do usuário no banco PostgreSQL.");
      }
    } catch (err) {
      console.error("Erro de rede ao tentar sincronizar usuário:", err);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    try {
      setLoading(true);
      setError('');
      
      const decoded: GoogleJwtPayload = jwtDecode(response.credential);
      
      if (!decoded.email.endsWith('@cin.ufpe.br')) {
        setError('Apenas contas institucionais do @cin.ufpe.br têm acesso permitido.');
        setLoading(false);
        return;
      }

      // 1. Salva os dados localmente no navegador
      localStorage.setItem('user_id', decoded.sub); // 💡 AGORA SALVA O ID REAL
      localStorage.setItem('user_name', decoded.name);
      localStorage.setItem('user_email', decoded.email);
      localStorage.setItem('user_picture', decoded.picture);

      // 2. Sincroniza (UPSERT) na tabela 'usuarios' do Postgres para liberar as Foreign Keys
      await sincronizarUsuarioNoBanco({
        id: decoded.sub,
        nome: decoded.name,
        email: decoded.email,
        avatar_url: decoded.picture
      });

      router.push('/reservas');
    } catch (err) {
      setError('Falha na autenticação com o Google.');
      setLoading(false);
    }
  };

  const handleLoginManual = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(async () => {
      if (!email.endsWith('@cin.ufpe.br')) {
        setError('Por favor, utilize seu e-mail institucional (@cin.ufpe.br).');
        setLoading(false);
        return;
      }
      if (password.length < 4) {
        setError('A senha deve ter pelo menos 4 caracteres (Ambiente Mock).');
        setLoading(false);
        return;
      }

      const mockId = `mock_${email.split('@')[0]}`; // Cria um ID estável a partir do e-mail
      const mockNome = email.split('@')[0];
      const mockAvatar = 'https://www.w3schools.com/howto/img_avatar.png';

      localStorage.setItem('user_id', mockId); // 💡 SALVA ID NO MOCK TAMBÉM
      localStorage.setItem('user_name', mockNome);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_picture', mockAvatar);

      // Sincroniza o usuário mockado no banco para o teste manual funcionar perfeitamente
      await sincronizarUsuarioNoBanco({
        id: mockId,
        nome: mockNome,
        email: email,
        avatar_url: mockAvatar
      });

      router.push('/reservas');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <div className="flex w-full flex-col justify-center px-8 py-12 md:w-1/2 lg:px-24 xl:px-32 bg-white">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reserva de Salas</h1>
            <p className="mt-2 text-sm text-slate-600">
              Acesse usando sua conta institucional do <span className="font-semibold text-red-700">CIn / UFPE</span>.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
              {error}
            </div>
          )}

          <div className="mb-6 flex flex-col items-center justify-center">
            <div id="googleButton" className="w-full"></div>
        
          </div>



          <p className="mt-8 text-center text-xs text-slate-400">
            Sessão Sincronizada com o Postgres • Grupo 2
          </p>
        </div>
      </div>

      <div className="relative w-1/2 md:block">
        {/* Imagem limpa, sem opacidade reduzida ou efeitos de mistura de cor */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSL8brgtfHQH2UGGgWnfJqKmF7zrD0Y99zgoO7Q0W6ih-D_BdGm6KoZuNFR&s=10')` }}
        />
        
        {/* Container de texto sem o gradiente de cor escura no fundo */}
        
      </div>
    </div>
  );
}

declare global {
  interface Window {
    google: any;
  }
}