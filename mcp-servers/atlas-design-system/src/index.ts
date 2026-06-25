#!/usr/bin/env node
// Atlas Design System MCP server.
// Exposes tokens, components and helpers for consistent UI.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  COLORS,
  COMPONENTS_MOBILE,
  COMPONENTS_WEB,
  EASE,
  FONT,
  PHONE_SCREENS,
  RADIUS,
  SHADOW,
  SPACE,
  THEMES,
  validatePalette,
} from "./tokens.js";

const server = new Server(
  { name: "atlas-design-system", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ds_generate_component",
      description: "Scaffold a component skeleton for web (React) or mobile (React Native) using Atlas tokens.",
      inputSchema: {
        type: "object",
        properties: {
          framework: { type: "string", enum: ["react", "react-native"] },
          name: { type: "string", description: "PascalCase component name" },
          kind: { type: "string", enum: ["button", "card", "input", "list-item"], default: "card" },
        },
        required: ["framework", "name"],
      },
    },
    {
      name: "ds_validate_palette",
      description: "Verify a list of hex colors belongs to the official Atlas palette. Returns invalid + valid sets.",
      inputSchema: {
        type: "object",
        properties: {
          colors: { type: "array", items: { type: "string" } },
        },
        required: ["colors"],
      },
    },
    {
      name: "ds_get_theme_vars",
      description: "Returns the CSS variable map for dark or light theme.",
      inputSchema: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["dark", "light"] },
        },
        required: ["theme"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = args ?? {};

  switch (name) {
    case "ds_generate_component": {
      const { framework, name: cname, kind = "card" } = z
        .object({ framework: z.enum(["react", "react-native"]), name: z.string(), kind: z.enum(["button", "card", "input", "list-item"]).optional() })
        .parse(a);
      const code = framework === "react"
        ? scaffoldReact(cname, kind)
        : scaffoldRN(cname, kind);
      return { content: [{ type: "text", text: code }] };
    }
    case "ds_validate_palette": {
      const { colors } = z.object({ colors: z.array(z.string()) }).parse(a);
      return { content: [{ type: "text", text: JSON.stringify(validatePalette(colors), null, 2) }] };
    }
    case "ds_get_theme_vars": {
      const { theme } = z.object({ theme: z.enum(["dark", "light"]) }).parse(a);
      return { content: [{ type: "text", text: JSON.stringify(THEMES[theme], null, 2) }] };
    }
    default:
      throw new Error(`unknown_tool: ${name}`);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "ds://tokens/colors", name: "Colors", mimeType: "application/json" },
    { uri: "ds://tokens/spacing", name: "Spacing scale", mimeType: "application/json" },
    { uri: "ds://tokens/radius", name: "Radius scale", mimeType: "application/json" },
    { uri: "ds://tokens/shadows", name: "Shadows", mimeType: "application/json" },
    { uri: "ds://tokens/typography", name: "Typography", mimeType: "application/json" },
    { uri: "ds://tokens/ease", name: "Easing curves", mimeType: "application/json" },
    { uri: "ds://themes", name: "Dark + light theme maps", mimeType: "application/json" },
    { uri: "ds://components/web", name: "Web component snippets", mimeType: "application/json" },
    { uri: "ds://components/mobile", name: "Mobile component snippets", mimeType: "application/json" },
    { uri: "ds://phone-screens", name: "Canonical mobile screen ids (from demo-ui.html)", mimeType: "application/json" },
    { uri: "ds://rules", name: "Rules to enforce when building UI", mimeType: "text/markdown" },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  const j = (v: unknown) => ({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(v, null, 2) }] });
  switch (uri) {
    case "ds://tokens/colors": return j(COLORS);
    case "ds://tokens/spacing": return j(SPACE);
    case "ds://tokens/radius": return j(RADIUS);
    case "ds://tokens/shadows": return j(SHADOW);
    case "ds://tokens/typography": return j(FONT);
    case "ds://tokens/ease": return j(EASE);
    case "ds://themes": return j(THEMES);
    case "ds://components/web": return j(COMPONENTS_WEB);
    case "ds://components/mobile": return j(COMPONENTS_MOBILE);
    case "ds://phone-screens": return j(PHONE_SCREENS);
    case "ds://rules":
      return {
        contents: [{
          uri,
          mimeType: "text/markdown",
          text: `# Atlas Design System Rules

1. No hard-coded hex in app code. Use var(--accent) on web; theme.colors.accent on mobile.
2. Spacing values come from the SPACE scale only.
3. Border radius: sm/md/lg/xl/pill only.
4. Fonts: Inter (sans), JetBrains Mono (mono). No others.
5. Both dark and light themes must work for every screen.
6. Mobile touch targets >= 44px.
7. Compare every screen with demo/ before merge.`,
        }],
      };
    default:
      throw new Error(`unknown_resource: ${uri}`);
  }
});

function scaffoldReact(name: string, kind: string): string {
  if (kind === "button") return `import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "success";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export function ${name}({ variant = "primary", size = "md", className = "", ...rest }: Props) {
  const cls = ["btn", \`btn-\${variant}\`, size === "sm" && "btn-sm", className].filter(Boolean).join(" ");
  return <button className={cls} {...rest} />;
}
`;
  if (kind === "input") return `import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; }

export const ${name} = forwardRef<HTMLInputElement, Props>(({ label, id, ...rest }, ref) => (
  <label className="atlas-input">
    <span>{label}</span>
    <input ref={ref} id={id} {...rest} />
  </label>
));
${name}.displayName = "${name}";
`;
  return `import { PropsWithChildren } from "react";

interface Props { title?: string; }

export function ${name}({ title, children }: PropsWithChildren<Props>) {
  return (
    <article className="card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </article>
  );
}
`;
}

function scaffoldRN(name: string, kind: string): string {
  if (kind === "button") return `import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@atlas/ui";

interface Props { label: string; onPress: () => void; variant?: "primary" | "ghost"; }

export function ${name}({ label, onPress, variant = "primary" }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { backgroundColor: variant === "primary" ? theme.colors.accent : theme.colors.surface, opacity: pressed ? 0.9 : 1 }]}
    >
      <Text style={[styles.label, { color: variant === "primary" ? theme.colors.bg : theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: "center" },
  label: { fontWeight: "600", fontSize: 15 },
});
`;
  return `import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@atlas/ui";
import type { PropsWithChildren } from "react";

interface Props { title?: string; }

export function ${name}({ title, children }: PropsWithChildren<Props>) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.bgElev, borderColor: theme.colors.border }]}>
      {title ? <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  title: { fontSize: 16, fontWeight: "700" },
});
`;
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[atlas-design-system] MCP server ready");
