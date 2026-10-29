import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthExperience } from './auth/AuthExperience';
import { getStoredUser } from './auth/auth';
import { installWorkspaceActivityTracking } from './services/workspace-preferences';
import { RemoteWorkspaceDialog } from './components/RemoteWorkspaceDialog';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import './style.css';
import './runtime/whiteboard-empty-focus.css';

document.body.classList.add(
  'rt182-host','rt183-host','rt184-host','rt185-host','rt186-host','rt189-host',
  'rt1810-host','rt1811-host','rt1815-host','rt190-host','rt191-host','rt194-host','bo-v1130','bo-v1140','bo-v1150','bo-v1153','bo-v1162','bo-v1163','bo-v1170','bo-v1171','bo-v1172','bo-v1173','bo-v1174','bo-v1175','bo-v1176','bo-v1178','bo-v1179','bo-v1180','bo-v1181','bo-v1182','bo-v1183','bo-v1184','bo-v1185','bo-v1186','bo-v1187','bo-v1188','bo-v1189','bo-h713','bo-h714','bo-h715','bo-h716','bo-h717','bo-h718','bo-h718h1','bo-h719','bo-h719h1','bo-h720','bo-h720h1','bo-h721','bo-h722','bo-h723','bo-h724j','bo-h729','bo-h730','bo-h731','bo-h732','bo-h733','bo-h734','bo-h735','bo-h736','bo-h737','bo-h738','bo-h739','bo-h740','bo-h740h2','bo-h740h3','bo-h740h4','bo-h740h5','bo-h740h7','bo-h740h8','bo-h740h9','bo-h740h10','bo-h740h11','bo-h740h12','bo-h740h13','bo-h740h14','bo-h740h153','bo-h740h154','bo-h740h155','bo-h740h156','bo-h16','bo-h161','bo-h162','bo-h165','bo-h1651','bo-h166','bo-h167','bo-h168','bo-h17',
);

installWorkspaceActivityTracking(() => getStoredUser()?.id ?? 'local_guest');

function mountApplication() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Elemento raiz da aplicação não encontrado.');

  const appRoot = createRoot(rootElement);
  appRoot.render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AuthExperience />
        <RemoteWorkspaceDialog />
      </AppErrorBoundary>
    </React.StrictMode>,
  );

  // V1.17.9: the authentication entry is allowed to render immediately.
  // Persistence recovery is prepared when the user actually enters a workspace.
  requestAnimationFrame(() => {
    document.getElementById('bo1120-boot')?.remove();
    window.dispatchEvent(new CustomEvent('rt-entry-ready'));
  });
}

mountApplication();
