export interface StoredStyle {
  id: string;
  name: string;
  prompt: string;
  gender: 'male' | 'female' | 'unisex';
  section: 'lifestyle' | 'formal' | 'artistic';
  imageUrl?: string;
  previewGradient?: string;
}

