export default function NewLandingPage() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, backgroundColor: '#000000' }}>
      <iframe 
        src="/halon-home.html" 
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Cantor Design Reference"
      />
    </div>
  );
}
