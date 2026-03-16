import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ChatBot from '../dashboard/ChatBot';

function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-panel">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
      {/* Global sticky chatbot — visible on all authenticated pages */}
      <ChatBot />
    </div>
  );
}

export default Layout;

