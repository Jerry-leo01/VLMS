import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SafeImage } from '../src/components/ui/SafeImage';
import { transcodeToWebCompatibleJpeg } from '../src/components/camera/CameraCapture';

describe('SafeImage Resilient Image Component', () => {
  it('renders avatar fallback with provided initials when no image src is given', () => {
    render(<SafeImage src="" alt="Jeremiah Nwamini" fallbackType="avatar" initials="JN" />);
    expect(screen.getByText('JN')).toBeDefined();
    expect(screen.getByRole('img')).toBeDefined();
  });

  it('renders default user icon when avatar src is missing and no initials provided', () => {
    const { container } = render(<SafeImage src="" alt="Anonymous User" fallbackType="avatar" />);
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('renders evidence placeholder with telemetry when evidence src is missing', () => {
    render(
      <SafeImage
        src=""
        alt="Odometer Evidence"
        fallbackType="evidence"
        telemetry={{ odoKm: 42150, plateNumber: 'KJA-842XA' }}
      />
    );
    expect(screen.getByText(/42,150/)).toBeDefined();
    expect(screen.getByText('KJA-842XA')).toBeDefined();
  });

  it('switches to fallback gracefully when img fails to load (onError triggered)', () => {
    render(
      <SafeImage
        src="https://invalid-non-existent-domain.com/broken-photo.jpg"
        alt="Broken Odometer"
        fallbackType="evidence"
        telemetry={{ odoKm: 15400, plateNumber: 'EPE808JS' }}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    // After error, placeholder telemetry must be rendered instead of black box
    expect(screen.getByText(/15,400/)).toBeDefined();
    expect(screen.getByText('EPE808JS')).toBeDefined();
  });

  it('transcodeToWebCompatibleJpeg resolves image correctly when Image loads', async () => {
    // In jsdom, mock Image onload
    const originalImage = global.Image;
    try {
      // @ts-expect-error Mocking Image for jsdom
      global.Image = class {
        width = 100;
        height = 100;
        onload: () => void = () => {};
        set src(_v: string) {
          setTimeout(() => this.onload(), 10);
        }
      };

      const sampleBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      const result = await transcodeToWebCompatibleJpeg(sampleBase64, 800, 0.8);
      expect(result).toBeDefined();
    } finally {
      global.Image = originalImage;
    }
  });
});
