function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Brak ${name} w .env`);
  return v;
}

export const token: string = mustEnv("DISCORD_TOKEN");
export const guildId: string | undefined = process.env.GUILD_ID;

export const envWelcomeChannelId: string | undefined = process.env.WELCOME_CHANNEL_ID;

export const envGoodbyeChannelId: string | undefined = process.env.GOODBYE_CHANNEL_ID;
