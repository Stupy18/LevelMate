import * as ExpoLocation from 'expo-location';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface SelectedLocation {
  locationName: string;
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  googlePlaceId: string;
  googlePhotoReference: string | null;
}

interface Props {
  value: SelectedLocation | null;
  onSelect: (location: SelectedLocation | null) => void;
}

// TODO: PRODUCTION — replace with real GooglePlacesAutocomplete
// (see git history for the production-ready modal implementation)
const DEV_VENUES = [
  { id: '1', name: 'Gheorgheni Sports Complex', address: 'Str. Orăștie 5, Cluj-Napoca', lat: 46.7705, lng: 23.6157, placeId: 'ChIJ6XB0M2gMSUcRJ6dzgG4_fjU' },
  { id: '2', name: 'Sala Polivalentă Cluj', address: 'Str. Avram Iancu 1, Cluj-Napoca', lat: 46.7700, lng: 23.6060, placeId: 'ChIJsample002' },
  { id: '3', name: 'Central Park Cluj', address: 'Str. Republicii, Cluj-Napoca', lat: 46.7745, lng: 23.5991, placeId: 'ChIJsample003' },
  { id: '4', name: 'Cluj Arena', address: 'Str. Locul Baschet 1, Cluj-Napoca', lat: 46.7718, lng: 23.6036, placeId: 'ChIJsample004' },
  { id: '5', name: 'Municipal Swimming Pool', address: 'Str. Avram Iancu 27, Cluj-Napoca', lat: 46.7720, lng: 23.6080, placeId: 'ChIJsample005' },
];

export default function LocationPicker({ value, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const filtered = query.length > 0
    ? DEV_VENUES.filter(v =>
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.address.toLowerCase().includes(query.toLowerCase())
      )
    : DEV_VENUES;

  const showDropdown = focused && filtered.length > 0;

  async function useCurrentLocation() {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable location in Settings to use this feature.');
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const [geo] = await ExpoLocation.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const name = [geo?.name, geo?.street].filter(Boolean).join(' ') || 'Current location';
      const address = [geo?.street, geo?.city, geo?.region, geo?.country].filter(Boolean).join(', ');
      onSelect({
        locationName: name,
        locationAddress: address,
        locationLat: loc.coords.latitude,
        locationLng: loc.coords.longitude,
        googlePlaceId: '',
        googlePhotoReference: null,
      });
      setFocused(false);
    } catch {
      Alert.alert('Location unavailable', 'Could not get your location.');
    }
  }

  function selectVenue(venue: typeof DEV_VENUES[0]) {
    onSelect({
      locationName: venue.name,
      locationAddress: venue.address,
      locationLat: venue.lat,
      locationLng: venue.lng,
      googlePlaceId: venue.placeId,
      googlePhotoReference: null,
    });
    setQuery('');
    setFocused(false);
  }

  return (
    <View style={{ zIndex: 999 }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
        paddingHorizontal: 14, height: 48,
      }}>
        <MapPin size={16} color="#9CA3AF" />
        <TextInput
          style={{ flex: 1, fontSize: 15, color: '#0D0D14' }}
          placeholder="Search for a venue…"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={14} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View style={{
          position: 'absolute', top: 52, left: 0, right: 0, zIndex: 999,
          backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
          maxHeight: 240, overflow: 'hidden',
        }}>
          <Pressable
            onPress={useCurrentLocation}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F2F3F7' }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDE9FF', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={15} color="#6C47FF" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#6C47FF' }}>Use my current location</Text>
          </Pressable>
          {filtered.map((venue, index) => (
            <Pressable
              key={venue.id}
              onPress={() => selectVenue(venue)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingVertical: 12, paddingHorizontal: 16,
                borderBottomWidth: index < filtered.length - 1 ? 1 : 0,
                borderBottomColor: '#F2F3F7',
              }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F3F7', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={15} color="#6B7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#0D0D14' }} numberOfLines={1}>{venue.name}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>{venue.address}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {value && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FF', borderRadius: 12, padding: 12, marginTop: 8, gap: 8 }}>
          <MapPin size={14} color="#6C47FF" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6C47FF' }} numberOfLines={1}>{value.locationName}</Text>
            <Text style={{ fontSize: 12, color: '#8B6FFF' }} numberOfLines={1}>{value.locationAddress}</Text>
          </View>
          <TouchableOpacity onPress={() => onSelect(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={14} color="#6C47FF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
