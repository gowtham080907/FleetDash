import L from 'leaflet';
import { VehicleTelemetry } from '@/types/telemetry';
import { positionStore } from '@/stores/vehiclePositionStore';

export interface CanvasEngineMetrics {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  visibleCount: number;
  totalCount: number;
  cullRatio: number;
}

export interface HitTestResult {
  vehicle: VehicleTelemetry;
  screenX: number;
  screenY: number;
}

export class CanvasRenderEngine {
  private map: L.Map;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private isDestroyed = false;
  private isTabVisible = true;

  // Selected & Hovered Vehicle
  private selectedVehicleId: string | null = null;
  private hoveredVehicle: VehicleTelemetry | null = null;

  // Performance telemetry
  private frameCount = 0;
  private fpsUpdateTime = performance.now();
  private currentFps = 60;
  private fpsHistory: number[] = [];
  private lastRenderDurationMs = 0;
  private visibleCount = 0;

  // Callbacks
  private onMetricsUpdate?: (metrics: CanvasEngineMetrics) => void;
  private onVehicleClick?: (vehicle: VehicleTelemetry) => void;
  private onVehicleHover?: (result: HitTestResult | null) => void;

  constructor(
    map: L.Map,
    canvas: HTMLCanvasElement,
    options?: {
      onMetricsUpdate?: (metrics: CanvasEngineMetrics) => void;
      onVehicleClick?: (vehicle: VehicleTelemetry) => void;
      onVehicleHover?: (result: HitTestResult | null) => void;
    }
  ) {
    this.map = map;
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      throw new Error('Failed to acquire 2D canvas rendering context');
    }
    this.ctx = context;

    this.onMetricsUpdate = options?.onMetricsUpdate;
    this.onVehicleClick = options?.onVehicleClick;
    this.onVehicleHover = options?.onVehicleHover;

    this.bindEvents();
    this.resizeCanvas();
    this.startRenderLoop();
  }

  public setSelectedVehicleId(id: string | null): void {
    this.selectedVehicleId = id;
  }

  /**
   * Resizes canvas buffer to match container element & device pixel ratio.
   */
  public resizeCanvas(): void {
    if (this.isDestroyed || !this.canvas) return;

    const size = this.map.getSize();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size.x * dpr;
    this.canvas.height = size.y * dpr;
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;

    // Scale context to treat CSS pixels as logical pixels
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Performs hit-testing to detect click interaction with a vehicle marker.
   */
  public handleCanvasClick(screenX: number, screenY: number): void {
    const hit = this.hitTest(screenX, screenY, 18);
    if (hit) {
      this.selectedVehicleId = hit.vehicle.vehicleId;
      if (this.onVehicleClick) {
        this.onVehicleClick(hit.vehicle);
      }
    }
  }

  /**
   * Performs hover detection for instant tooltip display.
   */
  public handleCanvasMouseMove(screenX: number, screenY: number): void {
    const hit = this.hitTest(screenX, screenY, 14);
    if (hit) {
      this.hoveredVehicle = hit.vehicle;
      if (this.onVehicleHover) {
        this.onVehicleHover(hit);
      }
    } else {
      if (this.hoveredVehicle) {
        this.hoveredVehicle = null;
        if (this.onVehicleHover) {
          this.onVehicleHover(null);
        }
      }
    }
  }

  private hitTest(screenX: number, screenY: number, radiusPx = 16): HitTestResult | null {
    const vehicles = positionStore.getAllPositions();
    const bounds = this.map.getBounds();

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];

      // Quick bounding box filter before projection
      if (
        v.latitude < bounds.getSouth() ||
        v.latitude > bounds.getNorth() ||
        v.longitude < bounds.getWest() ||
        v.longitude > bounds.getEast()
      ) {
        continue;
      }

      const point = this.map.latLngToContainerPoint([v.latitude, v.longitude]);
      const dx = screenX - point.x;
      const dy = screenY - point.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusPx * radiusPx) {
        return { vehicle: v, screenX: point.x, screenY: point.y };
      }
    }

    return null;
  }

  private bindEvents(): void {
    // Leaflet map viewport change listeners
    this.map.on('move', this.handleMapTransform, this);
    this.map.on('zoom', this.handleMapTransform, this);
    this.map.on('resize', this.resizeCanvas, this);
    this.map.on('viewreset', this.resizeCanvas, this);

    // Tab visibility handling
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleMapTransform = (): void => {
    // Redraw immediately when user is panning or zooming
  };

  private handleVisibilityChange = (): void => {
    this.isTabVisible = !document.hidden;
  };

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      if (this.isDestroyed) return;

      if (this.isTabVisible) {
        this.renderFrame(timestamp);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Main 60 FPS Render Execution Routine
   */
  private renderFrame(timestamp: number): void {
    const renderStart = performance.now();

    // 1. FPS computation
    this.frameCount++;
    const elapsedSinceFpsCheck = timestamp - this.fpsUpdateTime;
    if (elapsedSinceFpsCheck >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsedSinceFpsCheck);
      this.frameCount = 0;
      this.fpsUpdateTime = timestamp;

      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 20) this.fpsHistory.shift();

      if (this.onMetricsUpdate) {
        const avgFps = Math.round(
          this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        );
        const total = positionStore.getCount();
        const cullRatio = total > 0 ? Number(((total - this.visibleCount) / total).toFixed(2)) : 0;

        this.onMetricsUpdate({
          fps: this.currentFps,
          avgFps,
          frameTimeMs: Number(this.lastRenderDurationMs.toFixed(2)),
          visibleCount: this.visibleCount,
          totalCount: total,
          cullRatio,
        });
      }
    }

    // 2. Clear canvas viewport
    const size = this.map.getSize();
    this.ctx.clearRect(0, 0, size.x, size.y);

    // 3. Viewport culling boundaries (with 10% safety margin)
    const bounds = this.map.getBounds();
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lngSpan = bounds.getEast() - bounds.getWest();

    const minLat = bounds.getSouth() - latSpan * 0.1;
    const maxLat = bounds.getNorth() + latSpan * 0.1;
    const minLng = bounds.getWest() - lngSpan * 0.1;
    const maxLng = bounds.getEast() + lngSpan * 0.1;

    // 4. Retrieve vehicle coordinates directly from mutable store
    const allVehicles = positionStore.getAllPositions();
    let drawn = 0;

    const beaconPhase = (timestamp % 1500) / 1500; // 0 to 1 pulsating wave

    // 5. Render visible units
    for (let i = 0; i < allVehicles.length; i++) {
      const v = allVehicles[i];

      // Viewport culling: Skip off-screen units
      if (
        v.latitude < minLat ||
        v.latitude > maxLat ||
        v.longitude < minLng ||
        v.longitude > maxLng
      ) {
        continue;
      }

      drawn++;

      // Project WGS84 GPS coords to container pixel space (x, y)
      const pt = this.map.latLngToContainerPoint([v.latitude, v.longitude]);
      const x = pt.x;
      const y = pt.y;

      const isSelected = v.vehicleId === this.selectedVehicleId;
      const isBreached = v.geofenceStatus === 'breached';

      // Draw pulsating breach beacon halo
      if (isBreached) {
        const beaconRadius = 14 + beaconPhase * 16;
        const beaconAlpha = Math.max(0, 1 - beaconPhase);

        this.ctx.beginPath();
        this.ctx.arc(x, y, beaconRadius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = `rgba(239, 68, 68, ${beaconAlpha * 0.7})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
      }

      // Draw glowing selection halo if active
      if (isSelected) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 16, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(0, 102, 255, 0.25)';
        this.ctx.fill();
        this.ctx.strokeStyle = '#0066FF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // Draw directional vehicle marker symbol
      this.drawVehicleSymbol(x, y, v.heading, v.status, isBreached, isSelected);
    }

    this.visibleCount = drawn;
    this.lastRenderDurationMs = performance.now() - renderStart;
  }

  /**
   * Draws a streamlined heading vector symbol directly on the Canvas.
   */
  private drawVehicleSymbol(
    x: number,
    y: number,
    heading: number,
    status: 'active' | 'idle' | 'offline',
    isBreached: boolean,
    isSelected: boolean
  ): void {
    const statusColor = isBreached
      ? '#EF4444'
      : status === 'active'
      ? '#10B981'
      : status === 'idle'
      ? '#F59E0B'
      : '#64748B';

    this.ctx.save();
    this.ctx.translate(x, y);

    // Rotate marker according to vehicle heading azimuth
    this.ctx.rotate((heading * Math.PI) / 180);

    const r = isSelected ? 8.5 : 7.0;

    // Draw aerodynamic chevron marker
    this.ctx.beginPath();
    this.ctx.moveTo(0, -r); // Nose
    this.ctx.lineTo(r * 0.75, r); // Right wing
    this.ctx.lineTo(0, r * 0.5); // Rear inner notch
    this.ctx.lineTo(-r * 0.75, r); // Left wing
    this.ctx.closePath();

    this.ctx.fillStyle = statusColor;
    this.ctx.fill();

    this.ctx.strokeStyle = isSelected ? '#FFFFFF' : '#0B1120';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Cleanly tears down the rendering loop, canvas contexts, and observers.
   */
  public destroy(): void {
    this.isDestroyed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.map.off('move', this.handleMapTransform, this);
    this.map.off('zoom', this.handleMapTransform, this);
    this.map.off('resize', this.resizeCanvas, this);
    this.map.off('viewreset', this.resizeCanvas, this);

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
