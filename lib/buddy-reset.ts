export type BuddyType = 'hype' | 'soft' | 'savage';

export function getResetPopupContent(buddy: BuddyType) {
  const content = {
    hype: [
      {
        title: 'Check your inbox 🔥',
        message:
          'If an account exists for this email, a reset link has been sent. We move.',
      },
      {
        title: 'Reset energy activated 💪',
        message:
          'If your email is linked to an account, your reset link is on the way.',
      },
      {
        title: 'No excuses now 😤',
        message:
          'Go check your inbox and spam. If the account exists, your reset email has been sent.',
      },
    ],
    soft: [
      {
        title: 'I sent help your way 💛',
        message:
          'If an account exists for this email, a reset link has been sent. Check your inbox gently.',
      },
      {
        title: 'You’re okay ✨',
        message:
          'If your email is linked to an account, your reset link will be waiting in your inbox.',
      },
      {
        title: 'A little help is on the way 💛',
        message:
          'Check your inbox and spam folder. If the account exists, your reset email has been sent.',
      },
    ],
    savage: [
      {
        title: 'Go check that email 😭',
        message:
          'If an account exists for this email, a reset link has been sent. Don’t now act confused.',
      },
      {
        title: 'Password drama detected 💀',
        message:
          'Check your inbox and spam. If the account exists, the reset link is there waiting for you.',
      },
      {
        title: 'Fix it and face your goals 😭',
        message:
          'If your email is linked to an account, your reset link has been sent. Move.',
      },
    ],
  };

  const list = content[buddy];
  return list[Math.floor(Math.random() * list.length)];
}