import L from 'leaflet';

/**
 * Continuous Smooth Wheel Zoom handler for Leaflet.
 * Provides fluid, sub-pixel Google Maps / Figma style zooming on both
 * mouse wheels and Mac trackpad pinch/scroll gestures.
 */

declare module 'leaflet' {
  interface MapOptions {
    smoothWheelZoom?: boolean | string;
    smoothSensitivity?: number;
  }
}

// Extend default options
(L.Map as any).mergeOptions({
  smoothWheelZoom: true,
  smoothSensitivity: 1,
});

function getNormalizedWheelDelta(e: WheelEvent): number {
  let delta = 0;
  if (e.deltaY) {
    if (e.deltaMode === 1) {
      // Line mode
      delta = -e.deltaY * 20;
    } else if (e.deltaMode === 2) {
      // Page mode
      delta = -e.deltaY * 60;
    } else {
      // Pixel mode (trackpads and precision mice)
      delta = -e.deltaY;
    }
  } else if ((e as any).wheelDeltaY) {
    delta = (e as any).wheelDeltaY / 2;
  } else if ((e as any).wheelDelta) {
    delta = (e as any).wheelDelta / 2;
  }

  // Handle trackpad pinch-to-zoom (ctrlKey is true during pinch on macOS Chrome/Safari)
  if (e.ctrlKey) {
    delta *= 1.5;
  }

  return delta;
}

const SmoothWheelZoom = (L.Handler as any).extend({
  addHooks(this: any) {
    L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this);
  },

  removeHooks(this: any) {
    L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this);
    if (this._zoomAnimationId) {
      cancelAnimationFrame(this._zoomAnimationId);
      this._zoomAnimationId = null;
    }
    clearTimeout(this._timeoutId);
  },

  _onWheelScroll(this: any, e: WheelEvent) {
    if (!this._isWheeling) {
      this._onWheelStart(e);
    }
    this._onWheeling(e);
  },

  _onWheelStart(this: any, e: WheelEvent) {
    const map = this._map;
    this._isWheeling = true;
    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._centerPoint = map.getSize().divideBy(2);
    this._startLatLng = map.containerPointToLatLng(this._centerPoint);
    this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);
    this._startZoom = map.getZoom();
    this._moved = false;
    this._zooming = true;

    map._stop();
    if (map._panAnim) map._panAnim.stop();

    this._goalZoom = map.getZoom();
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
  },

  _onWheeling(this: any, e: WheelEvent) {
    const map = this._map;

    const delta = getNormalizedWheelDelta(e);
    // Baseline zoom multiplier tuned for silky smooth responsiveness
    const sensitivity = map.options.smoothSensitivity ?? 1;
    this._goalZoom = this._goalZoom + delta * 0.0018 * sensitivity;

    if (this._goalZoom < map.getMinZoom() || this._goalZoom > map.getMaxZoom()) {
      this._goalZoom = (map as any)._limitZoom(this._goalZoom);
    }

    this._wheelMousePosition = map.mouseEventToContainerPoint(e);
    this._wheelMouseLatLng = map.containerPointToLatLng(this._wheelMousePosition);

    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 180);

    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);
  },

  _onWheelEnd(this: any) {
    this._isWheeling = false;
    if (this._map) {
      const diff = Math.abs(this._goalZoom - this._map.getZoom());
      if (diff < 0.001) {
        if (this._zoomAnimationId) {
          cancelAnimationFrame(this._zoomAnimationId);
          this._zoomAnimationId = null;
        }
        (this._map as any)._moveEnd(true);
      }
      // If diff is still closing, let _updateWheelZoom finish gliding to the exact target
    }
  },

  _updateWheelZoom(this: any) {
    const map = this._map;
    if (!map) return;

    // If an external event or pan interrupted the zoom, stop
    if (!map.getCenter().equals(this._prevCenter) || map.getZoom() !== this._prevZoom) {
      return;
    }

    const currentZoom = map.getZoom();
    const diff = this._goalZoom - currentZoom;

    if (Math.abs(diff) < 0.0005) {
      this._zoom = this._goalZoom;
      if (this._zoom === currentZoom && !this._isWheeling) {
        if (this._zoomAnimationId) {
          cancelAnimationFrame(this._zoomAnimationId);
          this._zoomAnimationId = null;
        }
        (map as any)._moveEnd(true);
        return;
      }
    } else {
      // 0.28 damping factor gives immediate responsiveness without visual snap
      this._zoom = currentZoom + diff * 0.28;
    }

    const delta = this._wheelMousePosition.subtract(this._centerPoint);

    if (map.options.smoothWheelZoom === 'center' || (delta.x === 0 && delta.y === 0)) {
      this._center = this._startLatLng;
    } else {
      this._center = map.unproject(
        map.project(this._wheelMouseLatLng, this._zoom).subtract(delta),
        this._zoom
      );
    }

    if (!this._moved) {
      (map as any)._moveStart(true, false);
      this._moved = true;
    }

    (map as any)._move(this._center, this._zoom);
    this._prevCenter = map.getCenter();
    this._prevZoom = map.getZoom();

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this));
  },
});

(L.Map as any).SmoothWheelZoom = SmoothWheelZoom;
(L.Map as any).addInitHook('addHandler', 'smoothWheelZoom', (L.Map as any).SmoothWheelZoom);

export default SmoothWheelZoom;
