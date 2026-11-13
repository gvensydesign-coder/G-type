// Buddy component builders. Documentation of props; every builder returns an HTML string styled by bundle.css.

type Tone = 'sky' | 'orange' | 'green' | 'pink' | 'yellow' | 'violet';
type IconName = string;      // any key of Buddy.icons, e.g. 'home', 'flame', 'plus'
type MascotName = 'buddy-happy' | 'buddy-streak' | 'buddy-sleepy' | 'sunny-happy' | 'sunny-sleepy' | 'leafy-umbrella' | 'zuzu-sleepy' | 'dawn-awake' | 'nox-snooze' | 'paws-heart';
type ObjectName = 'apple' | 'bike' | 'book' | 'bottle' | 'bulb' | 'calendar' | 'cloud' | 'dumbbell' | 'flame' | 'heart' | 'leaf' | 'moon' | 'sparkle' | 'target' | 'water-glass';

interface ButtonProps { label: string; variant?: 'primary' | 'secondary' | 'soft' | 'dark' | 'ghost'; size?: 'md' | 'lg'; icon?: IconName; iconEnd?: IconName; block?: boolean; disabled?: boolean; href?: string; logo?: string; cls?: string }
interface IconButtonProps { icon: IconName; label: string; variant?: 'soft' | 'glass' | 'send'; size?: 'md' | 'sm'; dot?: boolean; disabled?: boolean }
interface ChipProps { label: string; icon?: IconName; object?: ObjectName; tone?: Tone; filter?: boolean; pressed?: boolean }
interface ChatInputProps { placeholder?: string; label?: string }
interface TextFieldProps { label: string; type?: string; value?: string; placeholder?: string; icon?: IconName; hint?: string; error?: string }
interface SwitchProps { checked?: boolean; label?: string }
interface CardProps { html: string; variant?: 'flat' | 'tint' | 'lg'; cls?: string }
interface StatTileProps { label: string; value: string; unit: string; object?: ObjectName; mascot?: MascotName }
interface HabitRowProps { title: string; meta: string; icon?: IconName; object?: ObjectName; tone?: Tone; checked?: boolean; raised?: boolean }
interface ProgressCardProps { done?: number; total?: number; title?: string; left?: string; next?: string; mascot?: MascotName }
interface ProgressBarProps { value: number; segments?: number; tone?: Tone }
interface StreakCardProps { today?: number; title?: string; sub?: string; foot?: string }
interface SleepCardProps { title?: string; values?: number[] }
interface WorkoutCardProps { title?: string; sub?: string; percent?: number }
interface MetricRowProps { title: string; status?: string; value: number; total: number; icon?: IconName; object?: ObjectName; tone?: Tone; barTone?: Tone; badgeTone?: Tone }
interface TabBarProps { current?: string; items?: { id: string; icon: IconName; label: string }[] }
interface AppHeaderProps { title?: string; sub?: string; leading?: 'menu' | 'back'; tools?: 'home' | 'share'; bubble?: string; mascot?: MascotName; large?: boolean; inlineTitle?: boolean; round?: boolean; html?: string }
interface SpeechBubbleProps { text?: string; plain?: boolean }
interface BadgeProps { text: string; tone?: Tone | 'success' | 'warning' | 'danger' | 'info'; icon?: IconName; size?: 'md' | 'sm' }
interface BannerProps { title: string; text?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }
type PatternState = 'idle' | 'thinking' | 'searching' | 'answering' | 'success' | 'sleep';
interface PopBannerProps { title: string; text?: string; cta?: string; tone?: 'soft' | 'hero' | 'sunny' | 'leafy'; side?: 'right' | 'left'; over?: 'md' | 'lg'; mascot?: MascotName }
type SocialName = 'x' | 'threads' | 'bluesky' | 'instagram' | 'facebook' | 'telegram' | 'whatsapp' | 'youtube' | 'tiktok' | 'pinterest' | 'reddit' | 'discord' | 'snapchat' | 'vk' | 'max' | 'mastodon' | 'twitch' | 'github' | 'spotify' | 'signal' | 'viber' | 'apple' | 'google';
interface MedalProps { shape?: 'shield' | 'hex' | 'round'; tone?: 'violet' | 'orange' | 'green' | 'pink' | 'sky' | 'gold'; emblem?: IconName; text?: string | number; size?: 'sm' | 'md' | 'lg' | number; label?: string; count?: number | string; progress?: number; locked?: boolean; shine?: boolean; pop?: boolean; compact?: boolean }
interface AgentCardProps { title: string; desc: string; cover?: 'aurora' | 'sunset' | 'candy' | 'lagoon'; apps?: IconName[]; by?: string }

type ToonKind = 'cat' | 'dog' | 'bunny' | 'fox' | 'bear' | 'panda' | 'raccoon' | 'hamster';
type ToonClip = 'rest' | 'idle' | 'sway' | 'look_around' | 'curious' | 'sleepy' | 'happy' | 'bounce' | 'dance' | 'nod_yes' | 'shake_no' | 'surprise' | 'shy' | 'laugh' | 'sniff';
interface ToonApi { play(clip: ToonClip): void; auto(): void; blink(): void; lookAt(x: number | null, y?: number): void; setView(yaw: number, pitch: number, zoom?: number): void; set(o: { outline?: number; halftone?: number }): void; setPalette(p: Record<string, string>): void; pause(): void; resume(): void; destroy(): void; canvas: HTMLCanvasElement; react(clip: ToonClip, ms?: number): void; pop(): void }
interface PodhvatOptions { photos?: Partial<Record<'dog' | 'cat' | 'rabbit' | 'goat' | 'catMatch', string>>; tools?: boolean; persist?: boolean; fit?: boolean; skipBoot?: boolean; theme?: 'light' | 'dark'; state?: Record<string, unknown> }
interface BuddyApi {
  species(name: string, o?: { size?: number; cls?: string; alt?: string; style?: string }): string; speciesList: string[];
  Toon: { kinds: ToonKind[]; names: Record<ToonKind, { cls: string; ru: string; fb: string }>; clips: ToonClip[]; taps: [ToonClip, number][]; defaults: { look: string; outline: number; halftone: number; view: { yaw: number; pitch: number; zoom: number } }; host(kind: ToonKind, size?: number, o?: { cls?: string; label?: string }): string; available(kind: ToonKind): boolean; mount(host: HTMLElement, kind: ToonKind, o?: { tap?: boolean; mood?: ToonClip; look?: string; outline?: number; halftone?: number; view?: { yaw: number; pitch: number; zoom: number } }): ToonApi | null; gaze(api: ToonApi, host: HTMLElement, clientX: number, clientY: number, ms?: number): void };
  Podhvat: { mount(root: HTMLElement, o?: PodhvatOptions): { state: Record<string, unknown>; render(): void }; species: Record<string, string> };
  version: string;
  icons: Record<string, string>; mascots: string[]; objects: string[];
  icon(name: IconName, o?: { size?: number; stroke?: number; active?: boolean; label?: string; cls?: string }): string;
  mascot(name: MascotName, o?: { size?: number; cls?: string; alt?: string; style?: string }): string;
  object(name: ObjectName, o?: { size?: number; cls?: string; alt?: string }): string;
  Button(p: ButtonProps): string; IconButton(p: IconButtonProps): string; Tile(p: { icon?: IconName; object?: ObjectName; tone?: Tone; size?: 'sm' | 'lg' }): string; Chip(p: ChipProps): string;
  ChatInput(p?: ChatInputProps): string; TextField(p: TextFieldProps): string; Switch(p?: SwitchProps): string; Check(p?: { checked?: boolean; label?: string }): string;
  Card(p: CardProps): string; StatTile(p: StatTileProps): string; HabitRow(p: HabitRowProps): string; ProgressCard(p?: ProgressCardProps): string; ProgressBar(p: ProgressBarProps): string; StreakCard(p?: StreakCardProps): string;
  SleepCard(p?: SleepCardProps): string; WorkoutCard(p?: WorkoutCardProps): string; MetricRow(p: MetricRowProps): string;
  TabBar(p?: TabBarProps): string; AppHeader(p?: AppHeaderProps): string; SpeechBubble(p?: SpeechBubbleProps): string; Badge(p: BadgeProps): string; Banner(p: BannerProps): string; AgentCard(p: AgentCardProps): string;
  PopBanner(p: PopBannerProps): string; ThinkingIndicator(p?: { label?: string; ok?: boolean }): string;
  cloud(size?: 'sm' | 'md' | 'lg', o?: { style?: string; delay?: string; keep?: boolean; drift?: boolean; cls?: string }): string; decor(name: 'cloud-3d-lg' | 'cloud-3d-md' | 'cloud-3d-sm' | 'orb-3d' | 'heart-3d', o?: { size?: number; cls?: string; style?: string }): string; popArt(name: MascotName, size: number, o?: { over?: number; side?: 'left' | 'right'; shift?: number }): string; decors: string[];
  Pattern: { mount(host: HTMLElement, o?: { state?: PatternState; focus?: { x: number; y: number }; pitch?: number; cell?: number; radius?: number; intensity?: number; fps?: number; autoReturn?: boolean }): { el: HTMLCanvasElement; get(): PatternState; set(s: PatternState): void; destroy(): void }; states: PatternState[]; label(s: PatternState): string };
  social(name: SocialName, o?: { variant?: 'tile' | 'color' | 'mono'; size?: number }): string; SocialButton(p: { social: SocialName; label?: string }): string; ShareRow(p?: { items?: SocialName[] }): string; appIcon(size?: number, o?: { shape?: 'ios' | 'circle' | 'none'; src?: 'app-icon' | 'app-icon-mono' | 'app-icon-adaptive-fg' | 'app-icon-adaptive-bg' }): string; socials: SocialName[];
  Medal(p: MedalProps): string; MedalToast(p: { medals: MedalProps[]; title?: string; sub?: string }): string; Toast(p: { title: string; text?: string; icon?: IconName; tone?: 'info' | 'success' | 'warning' | 'danger' }): string; Avatar(p: { mascot?: MascotName; initials?: string; size?: number; tone?: Tone; ring?: boolean; status?: 'online' | 'away'; level?: number }): string;
  Message(p: { role?: 'buddy' | 'user'; text?: string; html?: string; extra?: string; time?: string; mascot?: MascotName }): string; Typing(): string; ToolCall(p?: { state?: 'search' | 'done'; title?: string; text?: string; sources?: SocialName[] }): string; MessageCard(p: { title: string; meta: string; cta?: string; icon?: IconName; object?: ObjectName; tone?: Tone }): string; Composer(p?: { placeholder?: string; send?: boolean }): string;
  ProfileHeader(p?: { name?: string; handle?: string; level?: number; xp?: number; xpLabel?: string; xpNext?: string; mascot?: MascotName }): string; StatRow(p?: { items?: { v: string; l: string }[] }): string; SettingsRow(p: { title: string; icon?: IconName; tone?: Tone; control?: 'switch'; checked?: boolean; value?: string }): string; SettingsGroup(p: { title?: string; rows: object[] }): string; SocialAccount(p: { social: SocialName; handle?: string; connected?: boolean }): string;
  NotificationItem(p: { type?: 'reminder' | 'streak' | 'badge' | 'friend' | 'tip' | 'system' | 'message'; title: string; text: string; time?: string; unread?: boolean; mascot?: MascotName; actions?: string[] }): string; NotificationGroup(p: { title: string; items: object[] }): string; Push(p: { title: string; text: string; time?: string; app?: string; platform?: 'ios' | 'android' }): string;
  InfoCard(p: { title: string; text?: string; tone?: Tone; icon?: IconName; eyebrow?: string; meta?: string; cta?: string }): string; InsightCard(p?: { label?: string; value?: string; unit?: string; tone?: Tone; trend?: { dir: 'up' | 'down'; text: string }; spark?: number[] }): string; ArticleCard(p: { title: string; tag?: string; minutes?: string; cover?: string; mascot?: MascotName }): string; QuoteCard(p?: { text?: string; by?: string; mascot?: MascotName }): string; StepsCard(p: { title?: string; steps: { t: string; done?: boolean }[] }): string;
  Widget(p?: { kind?: 'streak' | 'water' | 'mascot' | 'progress' | 'sleep' | 'quick' | 'habits'; size?: 's' | 'm' | 'l' }): string; LockWidget(p?: { type?: 'circle' | 'rect' | 'inline'; pct?: number; icon?: IconName; title?: string; text?: string }): string;
  Loader(p?: { kind?: 'squares' | 'bar' | 'orbit'; label?: string }): string; Splash(p?: { tag?: string }): string; Welcome(p?: { title?: string; text?: string; l1?: string; l2?: string }): string; Onboarding(p?: { current?: number; slides?: object[] }): string; LoadingScreen(p?: { label?: string }): string;
  Phone(inner: string, o?: { hero?: boolean; wash?: boolean; tabs?: string }): string; Stage(build: (theme: 'light' | 'dark') => string): string;
  setTheme(theme: 'light' | 'dark', el?: Element): void; countUp(el: Element, to: number, ms?: number, decimals?: number): void; burst(host: HTMLElement): void; wire(root?: Document | Element): void;
}
declare global { interface Window { Buddy: BuddyApi } }
export {};
