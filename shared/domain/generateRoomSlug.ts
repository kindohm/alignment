const adjectives = [
  "amber",
  "brisk",
  "cosmic",
  "dapper",
  "ember",
  "fabled",
  "glossy",
  "hushed",
  "lunar",
  "mellow",
  "neon",
  "silver",
  "velvet",
  "vivid"
];

const nouns = [
  "arcade",
  "atlas",
  "cipher",
  "comet",
  "harbor",
  "lantern",
  "orbit",
  "parlor",
  "signal",
  "studio",
  "summit",
  "vessel"
];

export const generateRoomSlug = (used: Set<string>, random = Math.random): string => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const adjective = adjectives[Math.floor(random() * adjectives.length)];
    const noun = nouns[Math.floor(random() * nouns.length)];
    const suffix = Math.floor(random() * 90) + 10;
    const slug = `${adjective}-${noun}-${suffix}`;

    if (!used.has(slug)) {
      return slug;
    }
  }

  return `room-${Date.now().toString(36)}`;
};
