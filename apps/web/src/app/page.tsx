import Image from 'next/image';

export default function Home() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-center gap-6 px-8 py-16 lg:px-20">
        <p className="text-sm uppercase tracking-[0.3em] text-gold-2">Plataforma privada</p>
        <h1 className="font-display text-6xl font-semibold text-gold">ELODIA OS</h1>
        <p className="max-w-md text-lg text-muted">
          Centro de control para dirección, comercialización, marketing y expansión de la marca.
        </p>
        <p className="text-sm text-muted">Acceso restringido. Inicio de sesión disponible próximamente.</p>
      </section>
      <section className="relative hidden items-center justify-center bg-sidebar lg:flex">
        <Image
          src="/brand/elodia-botella.png"
          alt="Botella ELODIA Tequila Añejo"
          width={512}
          height={768}
          priority
          className="h-[80vh] w-auto object-contain"
        />
      </section>
    </main>
  );
}
