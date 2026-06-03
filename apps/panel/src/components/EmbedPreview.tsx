"use client";

import type { EmbedConfig } from "@/lib/api";
import { numberToHex } from "@/lib/embed";

/** Podgląd embeda w stylu Discorda. `replace` podstawia zmienne w tekstach (np. {user}). */
export function EmbedPreview({
  embed,
  replace = (s) => s,
  buttonLabel,
  buttonEmoji,
}: {
  embed: EmbedConfig;
  replace?: (s: string) => string;
  buttonLabel?: string;
  buttonEmoji?: string;
}) {
  const barColor = typeof embed.color === "number" ? numberToHex(embed.color) : "#4f545c";

  const title = embed.title ? replace(embed.title) : "";
  const description = embed.description ? replace(embed.description) : "";
  const authorName = embed.authorName ? replace(embed.authorName) : "";
  const footerText = embed.footerText ? replace(embed.footerText) : "";
  const fields = (embed.fields ?? []).filter((f) => f.name?.trim() || f.value?.trim());

  const isEmpty =
    !title && !description && !authorName && !footerText && fields.length === 0 && !embed.imageUrl;

  return (
    <div className="rounded-lg bg-[#313338] p-4">
      <div
        className="overflow-hidden rounded border-l-4 bg-[#2b2d31] pl-3"
        style={{ borderColor: barColor }}
      >
        <div className="flex gap-3 p-3">
          <div className="min-w-0 flex-1">
            {authorName && (
              <div className="mb-1 flex items-center gap-2">
                {embed.authorIconUrl && (
                  <img src={embed.authorIconUrl} alt="" className="h-6 w-6 rounded-full" />
                )}
                <span className="text-sm font-semibold text-white">{authorName}</span>
              </div>
            )}

            {title &&
              (embed.url ? (
                <a
                  href={embed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-[#00a8fc] hover:underline"
                >
                  {title}
                </a>
              ) : (
                <p className="text-base font-semibold text-white">{title}</p>
              ))}

            {description && (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#dbdee1]">
                {description}
              </p>
            )}

            {fields.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {fields.map((f, i) => (
                  <div key={i} className={f.inline ? "" : "col-span-2"}>
                    <p className="text-xs font-semibold text-white">{replace(f.name)}</p>
                    <p className="whitespace-pre-wrap break-words text-xs text-[#dbdee1]">
                      {replace(f.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {embed.imageUrl && (
              <img
                src={embed.imageUrl}
                alt=""
                className="mt-3 max-h-48 rounded object-cover"
              />
            )}

            {(footerText || embed.timestamp) && (
              <div className="mt-2 flex items-center gap-2">
                {embed.footerIconUrl && (
                  <img src={embed.footerIconUrl} alt="" className="h-5 w-5 rounded-full" />
                )}
                <span className="text-xs text-[#949ba4]">
                  {footerText}
                  {footerText && embed.timestamp ? " • " : ""}
                  {embed.timestamp ? "dziś o 12:00" : ""}
                </span>
              </div>
            )}

            {isEmpty && (
              <p className="text-sm italic text-[#949ba4]">
                Pusty embed — uzupełnij pola po lewej.
              </p>
            )}
          </div>

          {embed.thumbnailUrl && (
            <img
              src={embed.thumbnailUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded object-cover"
            />
          )}
        </div>
      </div>

      {buttonLabel !== undefined && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1.5 rounded bg-[#5865f2] px-4 py-1.5 text-sm font-medium text-white">
            {buttonEmoji && <span>{buttonEmoji}</span>}
            {buttonLabel || "Przycisk"}
          </span>
        </div>
      )}
    </div>
  );
}
