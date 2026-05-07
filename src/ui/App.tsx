import { AdminApp } from "./admin/AdminApp";
import { RoomApp } from "./room/RoomApp";

export const App = () => {
  const path = window.location.pathname;

  if (path.startsWith("/admin")) {
    return <AdminApp />;
  }

  if (path.startsWith("/rooms/")) {
    return <RoomApp slug={decodeURIComponent(path.split("/rooms/")[1] ?? "")} />;
  }

  return (
    <main className="shell home">
      <section className="home-copy">
        <p className="kicker">alignment</p>
        <h1>Drag consensus into view.</h1>
        <p>
          Real-time alignment rooms for friends, teams, panels, and other suspiciously opinionated gatherings.
        </p>
        <div className="home-actions">
          <a className="button primary" href="/admin">
            Admin desk
          </a>
        </div>
      </section>
      <section className="home-board" aria-hidden="true">
        <div className="home-dot one" />
        <div className="home-dot two" />
        <div className="home-dot three" />
      </section>
    </main>
  );
};
