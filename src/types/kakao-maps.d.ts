/**
 * 카카오 Maps JS SDK 최소 타입 선언.
 *
 * 공식 타입 패키지를 추가하는 대신 실제로 쓰는 것만 적는다.
 * SDK는 `autoload=false`로 불러오므로 `kakao.maps.load()` 콜백 안에서만 사용 가능하다.
 */
declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
  }

  class LatLngBounds {
    constructor();
    extend(latlng: LatLng): void;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number });
    setBounds(bounds: LatLngBounds): void;
    setCenter(latlng: LatLng): void;
    relayout(): void;
  }

  class MarkerImage {
    constructor(src: string, size: Size);
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; title?: string; image?: MarkerImage; zIndex?: number });
    setMap(map: Map | null): void;
  }

  namespace event {
    function addListener(target: object, type: string, handler: () => void): void;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao?: typeof kakao;
}
