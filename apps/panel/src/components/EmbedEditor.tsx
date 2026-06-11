"use client";

import { useId } from "react";

import type { EmbedConfig, EmbedFieldConfig } from "@/lib/api";
import { DEFAULT_EMBED_COLOR, hexToNumber, numberToHex } from "@/lib/embed";

const INPUT =
  "w-full rounded-lg bg-background px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary";
const LABEL = "mb-1 block text-xs text-gray-400";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function EmbedEditor({
  value,
  onChange,
  variables,
}: {
  value: EmbedConfig;
  onChange: (next: EmbedConfig) => void;
  /** Lista dostępnych zmiennych do pokazania jako podpowiedź (np. ["{server}"]). */
  variables?: string[];
}) {
  const set = (patch: Partial<EmbedConfig>) => onChange({ ...value, ...patch });

  // Prefiks unikalny per instancja edytora (na stronie bywa ich kilka, np. welcome + goodbye).
  const uid = useId();
  const fieldId = (suffix: string) => `${uid}-${suffix}`;

  const fields = value.fields ?? [];
  const setFields = (next: EmbedFieldConfig[]) => set({ fields: next });
  const updateField = (i: number, patch: Partial<EmbedFieldConfig>) =>
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  return (
    <div className="flex flex-col gap-4">
      {/* Treść */}
      <div className="flex flex-col gap-3">
        <div>
          <label className={LABEL} htmlFor={fieldId("title")}>
            Tytuł
          </label>
          <input
            id={fieldId("title")}
            name="embedTitle"
            value={value.title ?? ""}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={256}
            placeholder="Tytuł embeda"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={fieldId("description")}>
            Opis
          </label>
          <textarea
            id={fieldId("description")}
            name="embedDescription"
            value={value.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
            maxLength={4096}
            rows={4}
            placeholder="Treść embeda (Markdown)"
            className={`${INPUT} resize-y`}
          />
          {variables && variables.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              Zmienne:{" "}
              {variables.map((v) => (
                <span key={v} className="mr-1 font-mono text-primary">
                  {v}
                </span>
              ))}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className={LABEL} htmlFor={fieldId("color")}>
              Kolor
            </label>
            <input
              id={fieldId("color")}
              name="embedColor"
              type="color"
              value={numberToHex(value.color ?? DEFAULT_EMBED_COLOR)}
              onChange={(e) => set({ color: hexToNumber(e.target.value) })}
              className="h-9 w-14 cursor-pointer rounded bg-transparent"
            />
          </div>
          <div className="flex-1">
            <label className={LABEL} htmlFor={fieldId("url")}>
              Link tytułu (URL)
            </label>
            <input
              id={fieldId("url")}
              name="embedUrl"
              value={value.url ?? ""}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://…"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* Autor */}
      <Group title="Autor (góra embeda)">
        <input
          name="embedAuthorName"
          aria-label="Nazwa autora"
          value={value.authorName ?? ""}
          onChange={(e) => set({ authorName: e.target.value })}
          maxLength={256}
          placeholder="Nazwa autora"
          className={INPUT}
        />
        <input
          name="embedAuthorIconUrl"
          aria-label="URL ikony autora"
          value={value.authorIconUrl ?? ""}
          onChange={(e) => set({ authorIconUrl: e.target.value })}
          placeholder="URL ikony autora"
          className={INPUT}
        />
      </Group>

      {/* Media */}
      <Group title="Grafika">
        <div>
          <label className={LABEL} htmlFor={fieldId("thumbnail")}>
            Miniatura (mały obrazek w rogu)
          </label>
          <input
            id={fieldId("thumbnail")}
            name="embedThumbnailUrl"
            value={value.thumbnailUrl ?? ""}
            onChange={(e) => set({ thumbnailUrl: e.target.value })}
            placeholder="URL miniatury (np. {avatar})"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={fieldId("image")}>
            Duży obrazek
          </label>
          <input
            id={fieldId("image")}
            name="embedImageUrl"
            value={value.imageUrl ?? ""}
            onChange={(e) => set({ imageUrl: e.target.value })}
            placeholder="URL obrazka"
            className={INPUT}
          />
        </div>
      </Group>

      {/* Stopka */}
      <Group title="Stopka">
        <input
          name="embedFooterText"
          aria-label="Tekst stopki"
          value={value.footerText ?? ""}
          onChange={(e) => set({ footerText: e.target.value })}
          maxLength={2048}
          placeholder="Tekst stopki"
          className={INPUT}
        />
        <input
          name="embedFooterIconUrl"
          aria-label="URL ikony stopki"
          value={value.footerIconUrl ?? ""}
          onChange={(e) => set({ footerIconUrl: e.target.value })}
          placeholder="URL ikony stopki"
          className={INPUT}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            name="embedTimestamp"
            checked={Boolean(value.timestamp)}
            onChange={(e) => set({ timestamp: e.target.checked })}
            className="h-4 w-4 accent-primary"
          />
          Pokaż datę/godzinę wysłania
        </label>
      </Group>

      {/* Pola */}
      <Group title={`Pola (${fields.length}/25)`}>
        {fields.map((f, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">Pole #{i + 1}</span>
              <button
                type="button"
                onClick={() => setFields(fields.filter((_, idx) => idx !== i))}
                className="text-xs text-gray-400 hover:text-red-400"
              >
                Usuń
              </button>
            </div>
            <input
              name={`embedField-${i}-name`}
              aria-label={`Nazwa pola #${i + 1}`}
              value={f.name}
              onChange={(e) => updateField(i, { name: e.target.value })}
              maxLength={256}
              placeholder="Nazwa pola"
              className={`${INPUT} mb-2`}
            />
            <textarea
              name={`embedField-${i}-value`}
              aria-label={`Wartość pola #${i + 1}`}
              value={f.value}
              onChange={(e) => updateField(i, { value: e.target.value })}
              maxLength={1024}
              rows={2}
              placeholder="Wartość pola"
              className={`${INPUT} resize-y`}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                name={`embedField-${i}-inline`}
                checked={Boolean(f.inline)}
                onChange={(e) => updateField(i, { inline: e.target.checked })}
                className="h-3.5 w-3.5 accent-primary"
              />
              W jednej linii (inline)
            </label>
          </div>
        ))}
        {fields.length < 25 && (
          <button
            type="button"
            onClick={() => setFields([...fields, { name: "", value: "", inline: false }])}
            className="rounded-lg border border-dashed border-white/10 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-white"
          >
            + Dodaj pole
          </button>
        )}
      </Group>
    </div>
  );
}
