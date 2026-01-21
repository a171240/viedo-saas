// ============================================
// Navigation Configuration
// ============================================

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon?: string; // Lucide icon name
  badge?: string; // "New", "Beta"
  requiresAuth?: boolean;
}

export interface NavGroup {
  id: string;
  title?: string; // Group header (optional)
  items: NavItem[];
}

// Left sidebar navigation
export const sidebarNavigation: NavGroup[] = [
  {
    id: "video",
    title: "VIDEO",
    items: [
      {
        id: "img2vid",
        title: "Image to Video",
        href: "/image-to-video",
        icon: "ImagePlay",
      },
      {
        id: "txt2vid",
        title: "Text to Video",
        href: "/text-to-video",
        icon: "Type",
      },
      {
        id: "ref2vid",
        title: "Reference Video",
        href: "/reference-to-video",
        icon: "Video",
      },
    ],
  },
  // Future IMAGE group
  // {
  //   id: "image",
  //   title: "IMAGE",
  //   items: [
  //     { id: "txt2img", title: "Text to Image", href: "/text-to-image", icon: "Image" },
  //   ],
  // },
  {
    id: "user",
    items: [
      {
        id: "creations",
        title: "My Creations",
        href: "/my-creations",
        icon: "FolderOpen",
        requiresAuth: true,
      },
    ],
  },
  {
    id: "account",
    items: [
      {
        id: "credits",
        title: "Credits",
        href: "/credits",
        icon: "Gem",
      },
      {
        id: "settings",
        title: "Settings",
        href: "/settings",
        icon: "Settings",
        requiresAuth: true,
      },
    ],
  },
];

// Landing page header - Models dropdown
export const headerModels = [
  { id: "sora", title: "Sora 2", subtitle: "by OpenAI", href: "/sora-2" },
  { id: "veo", title: "Veo 3.1", subtitle: "by Google", href: "/veo-3-1" },
  {
    id: "seedance",
    title: "Seedance 1.5",
    subtitle: "by ByteDance",
    href: "/seedance-1-5",
  },
  { id: "wan", title: "Wan 2.6", subtitle: "by Alibaba", href: "/wan-2-6" },
];

// Landing page header - Tools dropdown
export const headerTools = [
  {
    id: "img2vid",
    title: "Image to Video",
    href: "/image-to-video",
    icon: "ImagePlay",
  },
  {
    id: "txt2vid",
    title: "Text to Video",
    href: "/text-to-video",
    icon: "Type",
  },
  {
    id: "ref2vid",
    title: "Reference to Video",
    href: "/reference-to-video",
    icon: "Video",
  },
];

// User menu items
export const userMenuItems = [
  { id: "language", title: "Language", href: "#", icon: "Languages" },
  { id: "creations", title: "My Creations", href: "/my-creations", icon: "FolderOpen" },
  { id: "credits", title: "Credits", href: "/credits", icon: "Gem" },
  { id: "settings", title: "Settings", href: "/settings", icon: "Settings" },
  { id: "logout", title: "Logout", href: "#", icon: "LogOut" },
];
