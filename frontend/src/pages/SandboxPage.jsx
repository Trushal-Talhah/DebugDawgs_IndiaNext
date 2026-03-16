import SandboxPanel from '../components/sandbox/SandboxPanel';

function SandboxPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Sandbox</h1>
        <p className="text-sm text-muted mt-0.5">
          Test adversarial inputs and explore detection capabilities
        </p>
      </div>

      <div className="max-w-2xl">
        <SandboxPanel />
      </div>
    </div>
  );
}

export default SandboxPage;
