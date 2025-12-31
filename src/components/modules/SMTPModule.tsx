'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Save, TestTube, Mail, Zap, X, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export function SMTPModule() {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [showGmailHelp, setShowGmailHelp] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<any>(null);
  const [loadingOAuth, setLoadingOAuth] = useState(false);
  const [config, setConfig] = useState({
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    from: { name: '', address: '' },
  });

  useEffect(() => {
    loadConfig();
    checkOAuthStatus();

    // Verificar si viene de callback OAuth (usando window.location)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const oauthResult = params.get('oauth');
      const email = params.get('email');
      const message = params.get('message');

      if (oauthResult === 'success') {
        toast.success(`¡Conectado exitosamente con ${email}!`);
        checkOAuthStatus();
        // Limpiar parámetros de la URL
        window.history.replaceState({}, '', '/admin/smtp');
      } else if (oauthResult === 'error') {
        toast.error(`Error al conectar: ${message}`);
        window.history.replaceState({}, '', '/admin/smtp');
      }
    }
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.getSMTPConfig();
      setConfigured(res.configured);
      if (res.config) {
        setConfig({
          host: res.config.host || '',
          port: res.config.port || 587,
          secure: res.config.secure || false,
          auth: res.config.auth || { user: '', pass: '' },
          from: res.config.from || { name: '', address: '' },
        });
      }
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const checkOAuthStatus = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/auth/google/status');
      setOauthStatus(res.data);
    } catch (error) {
      console.error('Error checking OAuth status:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setLoadingOAuth(true);
      const res = await axios.get('http://localhost:3000/api/auth/google/init');

      // Abrir popup de Google OAuth
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        res.data.authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Escuchar cuando se cierre el popup o cambie la URL
      const checkInterval = setInterval(() => {
        checkOAuthStatus().then((status: any) => {
          if (status?.connected) {
            clearInterval(checkInterval);
            setLoadingOAuth(false);
          }
        });
      }, 2000);

      // Limpiar después de 2 minutos
      setTimeout(() => {
        clearInterval(checkInterval);
        setLoadingOAuth(false);
      }, 120000);

    } catch (error: any) {
      toast.error('Error al iniciar OAuth');
      setLoadingOAuth(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await axios.post('http://localhost:3000/api/auth/google/disconnect');
      toast.success('Cuenta de Google desconectada');
      setOauthStatus(null);
    } catch (error) {
      toast.error('Error al desconectar cuenta');
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await api.testSMTPConnection();
      if (res.success) {
        toast.success('✅ Conexión exitosa al servidor SMTP');
      } else {
        toast.error(`❌ ${res.message}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al probar conexión');
    } finally {
      setTesting(false);
    }
  };

  const configureGmail = () => {
    setConfig({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: config.auth.user || '', pass: config.auth.pass || '' },
      from: { name: config.from.name || 'Sistema Escolástica', address: config.auth.user || '' },
    });
    setShowGmailHelp(true);
    toast.info('Configuración de Gmail aplicada. Ingresa tu email y App Password.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.saveSMTPConfig(config);
      toast.success('Configuración guardada correctamente');
      setConfigured(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-9 mx-auto"></div>
          <p className="mt-4 text-neutral-10">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-accent-9" />
          Configuración SMTP
        </CardTitle>
        <CardDescription>
          Configura el servidor de correo para enviar notificaciones y reseteos de contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Sección OAuth con Google */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Conectar con Google
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Opción 1: Conecta tu cuenta de Gmail con un solo clic (Recomendado)
              </p>
            </div>
          </div>

          {oauthStatus?.connected ? (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Conectado</p>
                    <p className="text-sm text-green-700">{oauthStatus.email}</p>
                    <p className="text-xs text-neutral-10 mt-1">
                      Los emails se enviarán desde esta cuenta
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDisconnectGoogle}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleConnectGoogle}
              disabled={loadingOAuth}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base shadow-lg"
            >
              {loadingOAuth ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Abriendo ventana de Google...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Iniciar sesión con Google
                </>
              )}
            </Button>
          )}
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-neutral-4"></div>
          <span className="text-sm text-neutral-10 font-medium">O configura manualmente</span>
          <div className="flex-1 h-px bg-neutral-4"></div>
        </div>

        {/* Configuración rápida de Gmail */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Opción 2: Configuración Manual con App Password
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Si prefieres usar una contraseña de aplicación de Gmail
              </p>
            </div>
            <Button
              type="button"
              onClick={configureGmail}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Configurar Gmail
            </Button>
          </div>

          {showGmailHelp && (
            <div className="mt-4 p-3 bg-white rounded border border-blue-200">
              <p className="text-sm text-blue-900 font-medium mb-2">📧 Pasos para usar Gmail:</p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Ve a <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline font-medium">Seguridad de Google</a></li>
                <li>Activa la verificación en 2 pasos</li>
                <li>Genera una <strong>&quot;Contraseña de aplicación&quot;</strong> para &quot;Correo&quot;</li>
                <li>Copia esa contraseña de 16 caracteres y úsala abajo</li>
              </ol>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="host">Host SMTP *</Label>
              <Input
                id="host"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.gmail.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Puerto *</Label>
              <Input
                id="port"
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="secure"
              checked={config.secure}
              onCheckedChange={(checked) => setConfig({ ...config, secure: checked })}
            />
            <Label htmlFor="secure">Usar SSL/TLS (puerto 465)</Label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user">Email Usuario *</Label>
              <Input
                id="user"
                type="email"
                value={config.auth?.user || ''}
                onChange={(e) => setConfig({ ...config, auth: { ...(config.auth || {}), user: e.target.value } })}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authPass">Contraseña / App Password *</Label>
              <Input
                id="authPass"
                type="password"
                value={config.auth?.pass || ''}
                onChange={(e) => setConfig({ ...config, auth: { ...(config.auth || {}), pass: e.target.value } })}
                placeholder={configured ? '••••••••' : 'Contraseña o App Password'}
                required={!configured}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromName">Nombre Remitente *</Label>
              <Input
                id="fromName"
                value={config.from?.name || ''}
                onChange={(e) => setConfig({ ...config, from: { ...(config.from || {}), name: e.target.value } })}
                placeholder="Sistema Escolástica"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromAddress">Email Remitente *</Label>
              <Input
                id="fromAddress"
                type="email"
                value={config.from?.address || ''}
                onChange={(e) => setConfig({ ...config, from: { ...(config.from || {}), address: e.target.value } })}
                placeholder="noreply@ejemplo.com"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={testing || !config.host || !config.auth.user}
              className="flex-1"
            >
              <TestTube className="mr-2 h-4 w-4" />
              {testing ? 'Probando...' : 'Probar Conexión'}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent-9 hover:bg-accent-10"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
