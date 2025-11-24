/* @vitest-environment jsdom */
import React, { type ComponentProps, type MutableRefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SettingsMenu } from './SettingsMenu';

type SettingsMenuProps = ComponentProps<typeof SettingsMenu>;

function createAnchorElement(): HTMLElement {
  const anchor = document.createElement('button');
  Object.defineProperty(anchor, 'getBoundingClientRect', {
    value: () => ({
      top: 120,
      left: 80,
      width: 180,
      height: 32,
      bottom: 152,
      right: 260,
      x: 80,
      y: 120,
      toJSON: () => ({}),
    }),
  });
  document.body.appendChild(anchor);
  return anchor;
}

function createBaseProps(anchor: HTMLElement): SettingsMenuProps {
  const anchorRef = { current: anchor } as MutableRefObject<HTMLElement | null>;
  return {
    anchorRef,
    open: true,
    onClose: vi.fn(),
    common: {
      batchSize: 1,
      onBatchSizeChange: vi.fn(),
      min: 1,
      max: 4,
    },
    flux: {
      enabled: false,
      model: 'flux-pro-1.1',
      onModelChange: vi.fn(),
    },
    veo: {
      enabled: false,
      aspectRatio: '16:9',
      onAspectRatioChange: vi.fn(),
      model: 'veo-3.1-generate-preview',
      onModelChange: vi.fn(),
      negativePrompt: '',
      onNegativePromptChange: vi.fn(),
      seed: undefined,
      onSeedChange: vi.fn(),
    },
    hailuo: {
      enabled: false,
      duration: 6,
      onDurationChange: vi.fn(),
      resolution: '512P',
      onResolutionChange: vi.fn(),
      promptOptimizer: false,
      onPromptOptimizerChange: vi.fn(),
      fastPretreatment: false,
      onFastPretreatmentChange: vi.fn(),
      watermark: false,
      onWatermarkChange: vi.fn(),
      firstFrame: null,
      onFirstFrameChange: vi.fn(),
      lastFrame: null,
      onLastFrameChange: vi.fn(),
    },
    wan: {
      enabled: false,
      size: '1280x720',
      onSizeChange: vi.fn(),
      negativePrompt: '',
      onNegativePromptChange: vi.fn(),
      promptExtend: false,
      onPromptExtendChange: vi.fn(),
      watermark: false,
      onWatermarkChange: vi.fn(),
      seed: '',
      onSeedChange: vi.fn(),
    },
    seedance: {
      enabled: false,
      mode: 't2v',
      onModeChange: vi.fn(),
      ratio: '16:9',
      onRatioChange: vi.fn(),
      duration: 5,
      onDurationChange: vi.fn(),
      resolution: '1080p',
      onResolutionChange: vi.fn(),
      fps: 24,
      onFpsChange: vi.fn(),
      cameraFixed: false,
      onCameraFixedChange: vi.fn(),
      seed: '',
      onSeedChange: vi.fn(),
      firstFrame: null,
      onFirstFrameChange: vi.fn(),
      lastFrame: null,
      onLastFrameChange: vi.fn(),
    },
    recraft: {
      enabled: false,
      model: 'recraft-v3',
      onModelChange: vi.fn(),
    },
    runway: {
      enabled: false,
      model: 'runway-gen4',
      onModelChange: vi.fn(),
    },
    grok: {
      enabled: false,
      model: 'grok-2-image',
      onModelChange: vi.fn(),
    },
    gemini: {
      enabled: false,
      temperature: 0.5,
      onTemperatureChange: vi.fn(),
      outputLength: 512,
      onOutputLengthChange: vi.fn(),
      topP: 0.9,
      onTopPChange: vi.fn(),
    },
    qwen: {
      enabled: false,
      size: '1024x1024',
      onSizeChange: vi.fn(),
      promptExtend: false,
      onPromptExtendChange: vi.fn(),
      watermark: false,
      onWatermarkChange: vi.fn(),
    },
    kling: {
      enabled: false,
      model: 'kling-v2.1-master',
      onModelChange: vi.fn(),
      aspectRatio: '16:9',
      onAspectRatioChange: vi.fn(),
      duration: 5,
      onDurationChange: vi.fn(),
      mode: 'standard',
      onModeChange: vi.fn(),
      cfgScale: 5,
      onCfgScaleChange: vi.fn(),
      negativePrompt: '',
      onNegativePromptChange: vi.fn(),
      cameraType: 'none',
      onCameraTypeChange: vi.fn(),
      cameraConfig: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 1 },
      onCameraConfigChange: vi.fn(),
      statusMessage: null,
    },
    lumaPhoton: {
      enabled: false,
      model: 'luma-photon-1',
      onModelChange: vi.fn(),
    },
    lumaRay: {
      enabled: false,
      variant: 'luma-ray-2',
      onVariantChange: vi.fn(),
    },
  } satisfies SettingsMenuProps;
}

describe('SettingsMenu', () => {
  it('renders flux settings when enabled and reacts to selection', async () => {
    const anchor = createAnchorElement();
    const props = createBaseProps(anchor);
    const onModelChange = vi.fn();
    props.flux.enabled = true;
    props.flux.onModelChange = onModelChange;
    const user = userEvent.setup();

    render(<SettingsMenu {...props} />);

    expect(screen.getByText('Flux 1.1 Settings')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Flux Kontext Max (Highest Quality)');

    expect(onModelChange).toHaveBeenCalledWith('flux-kontext-max');

    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalledTimes(1);

    anchor.remove();
  });

  it('falls back to other providers and closes on escape', () => {
    const anchor = createAnchorElement();
    const props = createBaseProps(anchor);
    props.veo.enabled = true;

    render(<SettingsMenu {...props} />);

    expect(screen.getByText('Veo 3.1 Settings')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);

    anchor.remove();
  });
});
