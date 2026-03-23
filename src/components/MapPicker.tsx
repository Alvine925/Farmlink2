import React, { useState, useCallback, useEffect } from 'react';
import { Map, AdvancedMarker, Pin, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';

interface MapPickerProps {
  onSelect: (pos: { lat: number; lng: number; address: string }) => void;
  initialPos?: { lat: number; lng: number };
  height?: string;
  mapId?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({ 
  onSelect, 
  initialPos, 
  height = 'h-64',
  mapId = 'MAP_PICKER'
}) => {
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(initialPos || null);
  const geocodingLibrary = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!geocodingLibrary) return;
    setGeocoder(new geocodingLibrary.Geocoder());
  }, [geocodingLibrary]);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!geocoder) return;

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        onSelect({ lat, lng, address: results[0].formatted_address });
      } else {
        onSelect({ lat, lng, address: `Pinned at ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    });
  }, [geocoder, onSelect]);

  const handleMapClick = useCallback((e: any) => {
    const pos = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng };
    setMarkerPos(pos);
    reverseGeocode(pos.lat, pos.lng);
  }, [reverseGeocode]);

  // Update marker if initialPos changes (e.g. when switching tabs or loading data)
  useEffect(() => {
    if (initialPos) {
      setMarkerPos(initialPos);
    }
  }, [initialPos]);

  return (
    <Map
      defaultCenter={initialPos || { lat: -1.2921, lng: 36.8219 }} // Default to Nairobi
      defaultZoom={13}
      mapId={mapId}
      onClick={handleMapClick}
      className={`w-full ${height} rounded-xl overflow-hidden`}
    >
      {markerPos && (
        <AdvancedMarker position={markerPos}>
          <Pin background="#10b981" glyphColor="#fff" borderColor="#065f46" />
        </AdvancedMarker>
      )}
    </Map>
  );
};
