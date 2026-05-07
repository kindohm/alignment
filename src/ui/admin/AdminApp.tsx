import { Archive, Plus, Rocket, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { Chart, Game, RoomSummary } from "../../../shared/domain/types";
import { useAdminGate } from "../../admin/useAdminGate";
import { requestJson } from "../../api/requestJson";

type DraftImage = {
  url: string;
  filename: string;
  contentType: string;
};

export const AdminApp = () => {
  const adminGate = useAdminGate();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState("");
  const [xAxisName, setXAxisName] = useState("Lawful / Chaotic");
  const [yAxisName, setYAxisName] = useState("Good / Evil");
  const [images, setImages] = useState<DraftImage[]>([]);
  const [selectedChartId, setSelectedChartId] = useState("");

  const load = useCallback(async () => {
    const [nextCharts, nextRooms] = await Promise.all([
      requestJson<Chart[]>("/api/charts"),
      requestJson<RoomSummary[]>("/api/rooms")
    ]);
    setCharts(nextCharts);
    setRooms(nextRooms);
    setSelectedChartId((current) => current || nextCharts[0]?.id || "");
  }, []);

  useEffect(() => {
    if (adminGate.isAdmin) {
      void load();
    }
  }, [adminGate.isAdmin, load]);

  const onDrop = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        setImages((current) => [
          ...current,
          {
            url: String(reader.result),
            filename: file.name,
            contentType: file.type || "application/octet-stream"
          }
        ]);
      });

      reader.readAsDataURL(file);
    });
  }, []);

  const dropzone = useDropzone({
    accept: {
      "image/*": []
    },
    onDrop
  });

  const createChart = async () => {
    await requestJson<Chart>("/api/charts", {
      method: "POST",
      body: JSON.stringify({
        name,
        xAxisName,
        yAxisName,
        images
      })
    });
    setName("");
    setImages([]);
    await load();
  };

  const createRoom = async () => {
    const game = await requestJson<Game>("/api/games", {
      method: "POST",
      body: JSON.stringify({ chartId: selectedChartId })
    });
    window.location.href = `/rooms/${game.roomSlug}`;
  };

  if (!adminGate.ready) {
    return <main className="shell">Checking admin access...</main>;
  }

  if (!adminGate.isAdmin) {
    return (
      <main className="shell admin-grid">
        <section className="panel admin-hero">
          <p className="kicker">admin</p>
          <h1>Google gate</h1>
          <p>Admins must exist in Firestore at administrators/&lt;uid&gt;.</p>
        </section>
        <section className="panel">
          <button className="button primary" onClick={adminGate.signIn}>
            Sign in with Google
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell admin-grid">
      <section className="panel admin-hero">
        <p className="kicker">admin</p>
        <h1>Chart foundry</h1>
        <p>
          Build reusable templates, launch one-off rooms, let results harden into history.
          {adminGate.localMode ? " Local dev admin mode active." : ` Signed in as ${adminGate.email ?? "admin"}.`}
        </p>
      </section>

      <section className="panel form-panel">
        <div className="panel-title">
          <Plus size={18} />
          <h2>New chart</h2>
        </div>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Office Objects" />
        </label>
        <label>
          X axis
          <input value={xAxisName} onChange={(event) => setXAxisName(event.target.value)} />
        </label>
        <label>
          Y axis
          <input value={yAxisName} onChange={(event) => setYAxisName(event.target.value)} />
        </label>
        <div className="dropzone" {...dropzone.getRootProps()}>
          <input {...dropzone.getInputProps()} />
          <UploadCloud size={30} />
          <span>Drop images here</span>
        </div>
        <div className="image-strip">
          {images.map((image) => (
            <img key={image.url} src={image.url} alt="" />
          ))}
        </div>
        <button className="button primary" disabled={!name || images.length === 0} onClick={createChart}>
          Save chart
        </button>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Rocket size={18} />
          <h2>Launch room</h2>
        </div>
        <select value={selectedChartId} onChange={(event) => setSelectedChartId(event.target.value)}>
          {charts.map((chart) => (
            <option key={chart.id} value={chart.id}>
              {chart.name}
            </option>
          ))}
        </select>
        <button className="button primary" disabled={!selectedChartId} onClick={createRoom}>
          Create room
        </button>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Archive size={18} />
          <h2>Rooms</h2>
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <a key={room.slug} href={`/rooms/${room.slug}`}>
              <strong>{room.slug}</strong>
              <span>
                {room.chartName} / {room.status}
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
};
