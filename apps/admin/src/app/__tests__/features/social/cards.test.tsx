import { render, screen } from '@testing-library/react';

jest.mock('@/app/(routes)/(dashboard)/social/actions', () => ({
  disconnectTikTokAction: jest.fn(),
  disconnectInstagramAction: jest.fn(),
}));
jest.mock('@/app/features/social/postClient', () => ({ submitPost: jest.fn() }));
jest.mock('@/app/features/social/instagramClient', () => ({
  submitReel: jest.fn(),
  finishReel: jest.fn(),
}));

import {
  InstagramConnected,
  InstagramDisconnected,
  InstagramUnconfigured,
} from '@/app/(routes)/(dashboard)/social/InstagramCard';
import {
  TikTokConnected,
  TikTokDisconnected,
  TikTokUnconfigured,
} from '@/app/(routes)/(dashboard)/social/TikTokCard';
import { formatDate } from '@/app/(routes)/(dashboard)/social/cardStyles';

const NOW = 1_700_000_000_000;

const TIKTOK = {
  openId: 'oid',
  displayName: 'yosemitecrew',
  scope: 'video.publish',
  expiresAt: NOW,
  refreshExpiresAt: NOW,
  connectedAt: NOW,
  connectedByEmail: 'admin@example.com',
};

const INSTAGRAM = {
  userId: '178414',
  username: 'yosemite_crew',
  expiresAt: NOW,
  connectedAt: NOW,
  connectedByEmail: 'admin@example.com',
};

const CREATOR = {
  nickname: 'Yosemite',
  privacyOptions: ['SELF_ONLY' as const],
  maxVideoSeconds: 600,
  commentDisabled: false,
  duetDisabled: false,
  stitchDisabled: false,
};

describe('formatDate', () => {
  it('renders a readable date rather than an epoch number', () => {
    expect(formatDate(NOW)).toMatch(/\d{1,2}\s\w+\s\d{4}/);
  });
});

describe('TikTok card', () => {
  it('names the account and who connected it', () => {
    render(<TikTokConnected connection={TIKTOK} creator={CREATOR} />);
    expect(screen.getByText('@yosemitecrew')).toBeInTheDocument();
    expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post to TikTok' })).toBeInTheDocument();
  });

  it('warns and offers only drafts when the posting rules are unavailable', () => {
    render(<TikTokConnected connection={TIKTOK} creator={null} />);
    expect(screen.getByText(/only inbox drafts are offered/)).toBeInTheDocument();
    // With no creator info there is no audience list to choose from.
    expect(screen.queryByLabelText('Audience')).not.toBeInTheDocument();
  });

  it('falls back to a generic label when the handle is unknown', () => {
    render(<TikTokConnected connection={{ ...TIKTOK, displayName: '' }} creator={CREATOR} />);
    expect(screen.getByText(/the TikTok account/)).toBeInTheDocument();
  });

  it('offers a connect link when disconnected', () => {
    render(<TikTokDisconnected />);
    expect(screen.getByRole('link', { name: 'Connect TikTok' })).toHaveAttribute(
      'href',
      '/api/social/tiktok/connect'
    );
  });

  it('lists exactly the missing variables when unconfigured', () => {
    render(<TikTokUnconfigured missing={['TIKTOK_CLIENT_KEY', 'SOCIAL_TOKEN_KEY']} />);
    expect(screen.getByText('TIKTOK_CLIENT_KEY')).toBeInTheDocument();
    expect(screen.getByText('SOCIAL_TOKEN_KEY')).toBeInTheDocument();
  });
});

describe('Instagram card', () => {
  it('names the account and shows the publishing quota', () => {
    render(<InstagramConnected connection={INSTAGRAM} limit={{ used: 3, cap: 50 }} />);
    expect(screen.getByText('@yosemite_crew')).toBeInTheDocument();
    expect(screen.getByText(/3 of 50 posts used/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post to Instagram' })).toBeInTheDocument();
  });

  it('omits the quota line when the limit could not be read', () => {
    render(<InstagramConnected connection={INSTAGRAM} limit={null} />);
    expect(screen.queryByText(/posts used/)).not.toBeInTheDocument();
  });

  it('falls back to a generic label when the handle is unknown', () => {
    render(<InstagramConnected connection={{ ...INSTAGRAM, username: '' }} limit={null} />);
    expect(screen.getByText(/the Instagram account/)).toBeInTheDocument();
  });

  it('offers a connect link when disconnected', () => {
    render(<InstagramDisconnected />);
    expect(screen.getByRole('link', { name: 'Connect Instagram' })).toHaveAttribute(
      'href',
      '/api/social/instagram/connect'
    );
  });

  it('lists the missing variables and explains which app id is meant', () => {
    render(<InstagramUnconfigured missing={['INSTAGRAM_APP_ID']} />);
    expect(screen.getByText('INSTAGRAM_APP_ID')).toBeInTheDocument();
    expect(screen.getByText(/not the Meta app id/)).toBeInTheDocument();
  });
});
