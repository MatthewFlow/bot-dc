function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Brak ${name} w .env`);
  return v;
}

export const token: string = mustEnv("DISCORD_TOKEN");
export const guildId: string | undefined = process.env.GUILD_ID;
