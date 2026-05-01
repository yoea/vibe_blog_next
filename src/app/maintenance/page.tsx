import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/utils/admin';
import { MaintenanceClient } from './maintenance-client';

export const metadata = {
  title: '系统维护',
};

export default async function MaintenancePage() {
  const supabase = await createClient();
  const [{ data: config }, isAdmin] = await Promise.all([
    supabase
      .from('site_config')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single(),
    isSuperAdmin(),
  ]);

  const isMaintenanceOn = config?.value === 'true';

  return (
    <>
      <style>{maintenanceCSS}</style>

      <main className="m-main">
        <div className="m-card">
          <div
            className={`m-card-icon ${isMaintenanceOn ? '' : 'm-card-icon-ok'}`}
          >
            {isMaintenanceOn ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>

          {isMaintenanceOn ? (
            <>
              <h1 className="m-h1">站点维护中</h1>
              <p className="m-p">站点正在进行维护，暂时无法访问。</p>
              <p className="m-p">请稍后再来，感谢你的理解。</p>
            </>
          ) : (
            <>
              <h1 className="m-h1">维护已结束</h1>
              <p className="m-p">站点维护已完成，一切恢复正常。</p>
              <p className="m-p">你现在可以正常访问站点的所有功能。</p>
            </>
          )}

          <MaintenanceClient
            isAdmin={isAdmin}
            isMaintenanceOn={isMaintenanceOn}
          />
        </div>
      </main>
    </>
  );
}

const maintenanceCSS = `
  .m-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }
  .m-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 2.5rem 2rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
  }
  .m-card-icon {
    width: 56px; height: 56px;
    margin: 0 auto 1.25rem;
    border-radius: 1rem;
    background: linear-gradient(135deg, #6366f1, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
  .m-card-icon-ok {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }
  .m-card-icon svg { width: 28px; height: 28px; }
  .m-h1 { font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; }
  .m-p { font-size: 0.875rem; line-height: 1.6; color: var(--muted-foreground); margin-bottom: 0.375rem; }
`;
