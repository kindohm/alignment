import { Archive, LogOut, Plus, Rocket, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { Chart, Game, RoomSummary } from "../../../shared/domain/types";
import { useAdminGate } from "../../admin/useAdminGate";
import { requestJson } from "../../api/requestJson";

type DraftImage = {
  id: string;
  url: string;
  storageKey: string;
  filename: string;
  contentType: string;
  status: "uploading" | "done" | "error";
  error?: string;
};

export const AdminApp = () => {
  const adminGate = useAdminGate();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState("");
  const [xAxisMinLabel, setXAxisMinLabel] = useState("Evil");
  const [xAxisMaxLabel, setXAxisMaxLabel] = useState("Good");
  const [yAxisMinLabel, setYAxisMinLabel] = useState("Chaotic");
  const [yAxisMaxLabel, setYAxisMaxLabel] = useState("Lawful");
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
      const draftId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setImages((current) => [
        ...current,
        {
          id: draftId,
          url: previewUrl,
          storageKey: "",
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          status: "uploading"
        }
      ]);

      const upload = async () => {
        const formData = new FormData();
        formData.append("image", file);

        try {
          const response = await fetch("/api/uploads/images", {
            method: "POST",
            body: formData
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const uploaded = (await response.json()) as Omit<DraftImage, "id" | "status">;
          setImages((current) =>
            current.map((image) =>
              image.id === draftId
                ? {
                    ...image,
                    url: uploaded.url,
                    storageKey: uploaded.storageKey,
                    filename: uploaded.filename,
                    contentType: uploaded.contentType,
                    status: "done"
                  }
                : image
            )
          );
        } catch (error) {
          setImages((current) =>
            current.map((image) =>
              image.id === draftId
                ? {
                    ...image,
                    status: "error",
                    error: error instanceof Error ? error.message : "Upload failed"
                  }
                : image
            )
          );
        }
      };

      void upload();
    });
  }, []);

  const dropzone = useDropzone({
    accept: {
      "image/*": []
    },
    onDrop
  });

  const createChart = async () => {
    const uploadedImages = images
      .filter((image) => image.status === "done")
      .map((image) => ({
        url: image.url,
        storageKey: image.storageKey,
        filename: image.filename,
        contentType: image.contentType
      }));

    await requestJson<Chart>("/api/charts", {
      method: "POST",
      body: JSON.stringify({
        name,
        xAxisMinLabel,
        xAxisMaxLabel,
        yAxisMinLabel,
        yAxisMaxLabel,
        images: uploadedImages
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

  const deleteChart = async (chart: Chart) => {
    if (!window.confirm(`Delete "${chart.name}" and all associated rooms/images?`)) {
      return;
    }

    await requestJson<void>(`/api/charts/${chart.id}`, {
      method: "DELETE"
    });
    setSelectedChartId("");
    await load();
  };
  const isUploading = images.some((image) => image.status === "uploading");
  const hasUploadedImages = images.some((image) => image.status === "done");

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
        {!adminGate.localMode ? (
          <button className="button admin-signout" onClick={() => void adminGate.signOut()}>
            <LogOut size={16} />
            Sign out
          </button>
        ) : null}
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
        <div className="axis-form-grid">
          <label>
            X minimum
            <input value={xAxisMinLabel} onChange={(event) => setXAxisMinLabel(event.target.value)} />
          </label>
          <label>
            X maximum
            <input value={xAxisMaxLabel} onChange={(event) => setXAxisMaxLabel(event.target.value)} />
          </label>
          <label>
            Y minimum
            <input value={yAxisMinLabel} onChange={(event) => setYAxisMinLabel(event.target.value)} />
          </label>
          <label>
            Y maximum
            <input value={yAxisMaxLabel} onChange={(event) => setYAxisMaxLabel(event.target.value)} />
          </label>
        </div>
        <div className="dropzone" {...dropzone.getRootProps()}>
          <input {...dropzone.getInputProps()} />
          <UploadCloud size={30} />
          <span>Drop images here</span>
        </div>
        <div className="image-strip">
          {images.map((image) => (
            <figure key={image.id} className={`upload-tile ${image.status}`}>
              <img src={image.url} alt="" />
              <figcaption>
                <strong>{image.status}</strong>
                <span>{image.filename}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <button className="button primary" disabled={!name || !hasUploadedImages || isUploading} onClick={createChart}>
          {isUploading ? "Uploading..." : "Save chart"}
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
          <h2>Charts</h2>
        </div>
        <div className="chart-list">
          {charts.map((chart) => (
            <div key={chart.id} className="chart-list-row">
              <div>
                <strong>{chart.name}</strong>
                <span>
                  {chart.images.length} images / {chart.xAxisMinLabel} to {chart.xAxisMaxLabel} / {chart.yAxisMinLabel} to{" "}
                  {chart.yAxisMaxLabel}
                </span>
              </div>
              <button className="icon-button danger-icon" title="Delete chart" onClick={() => void deleteChart(chart)}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
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
