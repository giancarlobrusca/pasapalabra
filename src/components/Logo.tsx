export default function Logo({ small = false }: { small?: boolean }) {
  return (
    <h1 className={`logo ${small ? 'logo-small' : ''}`}>
      <span className="logo-pasa">PASA</span>
      <span className="logo-palabra">PALABRA</span>
    </h1>
  );
}
