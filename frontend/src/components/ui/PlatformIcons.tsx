export function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path
        d="M16.5 12.05h-2.7v8.45h-3.5v-8.45H8.5v-3h1.8V7.1c0-1.5.71-3.85 3.85-3.85l2.83.01v2.91h-2.05c-.34 0-.81.17-.81.88v1.99h2.88l-.5 3.01z"
        fill="white"
      />
    </svg>
  );
}

export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0">
          <stop offset="0%" stopColor="#FD5" />
          <stop offset="50%" stopColor="#FF543E" />
          <stop offset="100%" stopColor="#C837AB" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#ig-grad)" />
      <rect x="5" y="5" width="14" height="14" rx="4" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="3.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="17" cy="7" r="1" fill="white" />
    </svg>
  );
}

export function LinkedInIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        d="M7.5 10v7h2v-7h-2zM8.5 6.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zM11.5 10v7h2v-3.5c0-1 .5-1.5 1.25-1.5s1.25.5 1.25 1.5V17h2v-4c0-2-1.12-3-2.75-3-.87 0-1.5.4-1.75.9V10h-2z"
        fill="white"
      />
    </svg>
  );
}

export function TwitterXIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path
        d="M13.36 10.87L17.55 6h-1L12.92 10.25 10.2 6H6.5l4.4 6.4L6.5 18h1l3.85-4.48L14.3 18H18l-4.64-7.13zm-1.36 1.58l-.45-.63L8 6.88h1.53l2.86 4.09.44.63L16.56 17.18h-1.53l-3.03-4.73z"
        fill="white"
      />
    </svg>
  );
}

export const PlatformIcon = ({ platform, size = 20 }: { platform: string; size?: number }) => {
  switch (platform) {
    case 'facebook': return <FacebookIcon size={size} />;
    case 'instagram': return <InstagramIcon size={size} />;
    case 'linkedin': return <LinkedInIcon size={size} />;
    case 'twitter': return <TwitterXIcon size={size} />;
    default: return <FacebookIcon size={size} />;
  }
};
