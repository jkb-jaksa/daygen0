export interface StoredStyle {
  id: string;
  name: string;
  prompt: string;
  gender: 'male' | 'female' | 'all';
  section: 'lifestyle' | 'formal' | 'artistic';
  imageUrl?: string;
}

