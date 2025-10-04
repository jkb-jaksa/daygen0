import { useState, useEffect } from "react";
import { 
  Brain, 
  Mic, 
  Camera, 
  Activity, 
  Upload, 
  Check,
  User,
  Zap,
  Download,
  Share2
} from "lucide-react";
import { buttons, glass, text, layout, inputs } from "../styles/designSystem";

interface ProfileSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  progress: number; // 0-100
  completed: boolean;
  color: string;
  gradient: string;
  accentColor: string;
  bgAccent: string;
  borderAccent: string;
}

interface ThinkData {
  beliefs: string[];
  values: string[];
  writingSamples: string[];
  decisionPatterns: string[];
}

interface SpeakData {
  voiceSamples: string[];
  textStyle: string;
  tonePreferences: string[];
  communicationStyle: string;
}

interface LookData {
  photos: string[];
  avatars: string[];
  outfitStyle: string[];
  physicalPreferences: string[];
}

interface ActData {
  habits: string[];
  behaviors: string[];
  facialExpressions: string[];
  bodyMovements: string[];
}

interface DigitalProfile {
  sections: ProfileSection[];
  think: ThinkData;
  speak: SpeakData;
  look: LookData;
  act: ActData;
  overallProgress: number;
}

const INITIAL_PROFILE: DigitalProfile = {
  sections: [
    {
      id: 'think',
      title: 'How I Think',
      description: 'Capture your philosophies, beliefs, and decision patterns',
      icon: Brain,
      progress: 0,
      completed: false,
      color: 'yellow',
      gradient: 'from-yellow-400 via-orange-500 to-red-500',
      accentColor: 'text-yellow-400',
      bgAccent: 'bg-yellow-400/5',
      borderAccent: 'border-yellow-400/20'
    },
    {
      id: 'speak',
      title: 'How I Speak',
      description: 'Voice samples, text style, and communication patterns',
      icon: Mic,
      progress: 0,
      completed: false,
      color: 'blue',
      gradient: 'from-blue-400 via-cyan-500 to-teal-500',
      accentColor: 'text-blue-400',
      bgAccent: 'bg-blue-400/5',
      borderAccent: 'border-blue-400/20'
    },
    {
      id: 'look',
      title: 'How I Look',
      description: 'Photos, avatars, and visual identity elements',
      icon: Camera,
      progress: 0,
      completed: false,
      color: 'purple',
      gradient: 'from-purple-400 via-pink-500 to-rose-500',
      accentColor: 'text-purple-400',
      bgAccent: 'bg-purple-400/5',
      borderAccent: 'border-purple-400/20'
    },
    {
      id: 'act',
      title: 'How I Act',
      description: 'Habits, behaviors, and movement patterns',
      icon: Activity,
      progress: 0,
      completed: false,
      color: 'green',
      gradient: 'from-green-400 via-emerald-500 to-teal-500',
      accentColor: 'text-green-400',
      bgAccent: 'bg-green-400/5',
      borderAccent: 'border-green-400/20'
    }
  ],
  think: {
    beliefs: [],
    values: [],
    writingSamples: [],
    decisionPatterns: []
  },
  speak: {
    voiceSamples: [],
    textStyle: '',
    tonePreferences: [],
    communicationStyle: ''
  },
  look: {
    photos: [],
    avatars: [],
    outfitStyle: [],
    physicalPreferences: []
  },
  act: {
    habits: [],
    behaviors: [],
    facialExpressions: [],
    bodyMovements: []
  },
  overallProgress: 0
};

export default function DigitalCopy() {
  const [profile, setProfile] = useState<DigitalProfile>(INITIAL_PROFILE);
  const [currentSection, setCurrentSection] = useState<string>('think');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string>("");

  // Calculate progress for each section
  const calculateSectionProgress = (sectionId: string): number => {
    switch (sectionId) {
      case 'think':
        const thinkTotal = 4;
        const thinkCompleted = [
          profile.think.beliefs.length > 0,
          profile.think.values.length > 0,
          profile.think.writingSamples.length > 0,
          profile.think.decisionPatterns.length > 0
        ].filter(Boolean).length;
        return Math.round((thinkCompleted / thinkTotal) * 100);
      
      case 'speak':
        const speakTotal = 4;
        const speakCompleted = [
          profile.speak.voiceSamples.length > 0,
          profile.speak.textStyle.length > 0,
          profile.speak.tonePreferences.length > 0,
          profile.speak.communicationStyle.length > 0
        ].filter(Boolean).length;
        return Math.round((speakCompleted / speakTotal) * 100);
      
      case 'look':
        const lookTotal = 4;
        const lookCompleted = [
          profile.look.photos.length > 0,
          profile.look.avatars.length > 0,
          profile.look.outfitStyle.length > 0,
          profile.look.physicalPreferences.length > 0
        ].filter(Boolean).length;
        return Math.round((lookCompleted / lookTotal) * 100);
      
      case 'act':
        const actTotal = 4;
        const actCompleted = [
          profile.act.habits.length > 0,
          profile.act.behaviors.length > 0,
          profile.act.facialExpressions.length > 0,
          profile.act.bodyMovements.length > 0
        ].filter(Boolean).length;
        return Math.round((actCompleted / actTotal) * 100);
      
      default:
        return 0;
    }
  };

  // Update section progress
  useEffect(() => {
    const updatedSections = profile.sections.map(section => ({
      ...section,
      progress: calculateSectionProgress(section.id),
      completed: calculateSectionProgress(section.id) === 100
    }));

    const overallProgress = Math.round(
      updatedSections.reduce((sum, section) => sum + section.progress, 0) / updatedSections.length
    );

    setProfile(prev => ({
      ...prev,
      sections: updatedSections,
      overallProgress
    }));
  }, [profile.think, profile.speak, profile.look, profile.act]);

  const handleGenerateCopy = async () => {
    setIsGenerating(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const copyText = `Digital Profile Generated:

OVERALL PROGRESS: ${profile.overallProgress}%

=== HOW I THINK ===
Beliefs: ${profile.think.beliefs.join(', ') || 'Not specified'}
Values: ${profile.think.values.join(', ') || 'Not specified'}
Writing Samples: ${profile.think.writingSamples.length} samples
Decision Patterns: ${profile.think.decisionPatterns.join(', ') || 'Not specified'}

=== HOW I SPEAK ===
Voice Samples: ${profile.speak.voiceSamples.length} samples
Text Style: ${profile.speak.textStyle || 'Not specified'}
Tone Preferences: ${profile.speak.tonePreferences.join(', ') || 'Not specified'}
Communication Style: ${profile.speak.communicationStyle || 'Not specified'}

=== HOW I LOOK ===
Photos: ${profile.look.photos.length} photos
Avatars: ${profile.look.avatars.length} avatars
Outfit Style: ${profile.look.outfitStyle.join(', ') || 'Not specified'}
Physical Preferences: ${profile.look.physicalPreferences.join(', ') || 'Not specified'}

=== HOW I ACT ===
Habits: ${profile.act.habits.join(', ') || 'Not specified'}
Behaviors: ${profile.act.behaviors.join(', ') || 'Not specified'}
Facial Expressions: ${profile.act.facialExpressions.join(', ') || 'Not specified'}
Body Movements: ${profile.act.bodyMovements.join(', ') || 'Not specified'}

Generated on: ${new Date().toLocaleString()}`;
    
    setGeneratedCopy(copyText);
    setIsGenerating(false);
  };

  const handleDownloadCopy = () => {
    const blob = new Blob([generatedCopy], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digital-profile-copy.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareCopy = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Digital Profile Copy',
          text: generatedCopy,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      await navigator.clipboard.writeText(generatedCopy);
    }
  };

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'think':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Core Beliefs</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-yellow-400/30 focus:border-yellow-400/60`}
                  placeholder="What do you believe in? What are your core beliefs?"
                  value={profile.think.beliefs.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    think: { ...prev.think, beliefs: e.target.value.split('\n').filter(b => b.trim()) }
                  }))}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-orange-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Values</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-orange-400/30 focus:border-orange-400/60`}
                  placeholder="What do you value most? What principles guide your decisions?"
                  value={profile.think.values.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    think: { ...prev.think, values: e.target.value.split('\n').filter(v => v.trim()) }
                  }))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <label className="text-d-text font-raleway font-semibold text-lg">Writing Samples</label>
              </div>
              <textarea
                className={`${inputs.textarea} min-h-[140px] border-red-400/30 focus:border-red-400/60`}
                placeholder="Paste some of your writing samples here - emails, essays, social media posts, etc."
                value={profile.think.writingSamples.join('\n---\n')}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  think: { ...prev.think, writingSamples: e.target.value.split('\n---\n').filter(s => s.trim()) }
                }))}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <label className="text-d-text font-raleway font-semibold text-lg">Decision Patterns</label>
              </div>
              <textarea
                className={`${inputs.textarea} min-h-[120px] border-yellow-500/30 focus:border-yellow-500/60`}
                placeholder="How do you make decisions? What's your decision-making process?"
                value={profile.think.decisionPatterns.join('\n')}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  think: { ...prev.think, decisionPatterns: e.target.value.split('\n').filter(d => d.trim()) }
                }))}
              />
            </div>
          </div>
        );

      case 'speak':
        return (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-400/60" />
                <label className="text-d-text font-raleway font-semibold text-lg">Voice Samples</label>
              </div>
              <div className="border-2 border-dashed border-blue-400/30 rounded-2xl p-8 text-center hover:border-blue-400/50 transition-colors duration-200">
                <div className="w-16 h-16 bg-blue-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-d-white/80 text-base font-medium mb-2">Upload voice recordings</p>
                <p className="text-d-white/60 text-sm">Drag & drop audio files or click to browse</p>
                <p className="text-d-white/50 text-xs mt-2">MP3, WAV, M4A supported</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-cyan-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Text Style</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-cyan-400/30 focus:border-cyan-400/60`}
                  placeholder="Describe your writing style - formal, casual, technical, creative, etc."
                  value={profile.speak.textStyle}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    speak: { ...prev.speak, textStyle: e.target.value }
                  }))}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-teal-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Tone Preferences</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-teal-400/30 focus:border-teal-400/60`}
                  placeholder="What tone do you prefer? Professional, friendly, authoritative, humorous, etc."
                  value={profile.speak.tonePreferences.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    speak: { ...prev.speak, tonePreferences: e.target.value.split('\n').filter(t => t.trim()) }
                  }))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-blue-500/60" />
                <label className="text-d-text font-raleway font-semibold text-lg">Communication Style</label>
              </div>
              <textarea
                className={`${inputs.textarea} min-h-[120px] border-blue-500/30 focus:border-blue-500/60`}
                placeholder="How do you communicate? Direct, diplomatic, detailed, concise, etc."
                value={profile.speak.communicationStyle}
                onChange={(e) => setProfile(prev => ({
                  ...prev,
                  speak: { ...prev.speak, communicationStyle: e.target.value }
                }))}
              />
            </div>
          </div>
        );

      case 'look':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-purple-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Photos</label>
                </div>
                <div className="border-2 border-dashed border-purple-400/30 rounded-2xl p-8 text-center hover:border-purple-400/50 transition-colors duration-200">
                  <div className="w-16 h-16 bg-purple-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-d-white/80 text-base font-medium mb-2">Upload photos of yourself</p>
                  <p className="text-d-white/60 text-sm">Drag & drop or click to browse</p>
                  <p className="text-d-white/50 text-xs mt-2">JPG, PNG supported</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-pink-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Avatars</label>
                </div>
                <div className="border-2 border-dashed border-pink-400/30 rounded-2xl p-8 text-center hover:border-pink-400/50 transition-colors duration-200">
                  <div className="w-16 h-16 bg-pink-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-pink-400" />
                  </div>
                  <p className="text-d-white/80 text-base font-medium mb-2">Create digital avatars</p>
                  <p className="text-d-white/60 text-sm">Various styles and formats</p>
                  <p className="text-d-white/50 text-xs mt-2">AI-generated or custom</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-rose-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Outfit Style</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-rose-400/30 focus:border-rose-400/60`}
                  placeholder="Describe your typical outfit style - casual, formal, trendy, minimalist, etc."
                  value={profile.look.outfitStyle.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    look: { ...prev.look, outfitStyle: e.target.value.split('\n').filter(s => s.trim()) }
                  }))}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-purple-500/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Physical Preferences</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-purple-500/30 focus:border-purple-500/60`}
                  placeholder="Any specific physical characteristics or preferences you'd like to highlight?"
                  value={profile.look.physicalPreferences.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    look: { ...prev.look, physicalPreferences: e.target.value.split('\n').filter(p => p.trim()) }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      case 'act':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Daily Habits</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-green-400/30 focus:border-green-400/60`}
                  placeholder="What are your daily habits? Morning routines, work patterns, etc."
                  value={profile.act.habits.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    act: { ...prev.act, habits: e.target.value.split('\n').filter(h => h.trim()) }
                  }))}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Behaviors</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-emerald-400/30 focus:border-emerald-400/60`}
                  placeholder="How do you typically behave in different situations? Social, professional, personal contexts."
                  value={profile.act.behaviors.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    act: { ...prev.act, behaviors: e.target.value.split('\n').filter(b => b.trim()) }
                  }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-teal-400/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Facial Expressions</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-teal-400/30 focus:border-teal-400/60`}
                  placeholder="How do you typically express emotions? Smiling, serious, animated, etc."
                  value={profile.act.facialExpressions.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    act: { ...prev.act, facialExpressions: e.target.value.split('\n').filter(f => f.trim()) }
                  }))}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <label className="text-d-text font-raleway font-semibold text-lg">Body Movements</label>
                </div>
                <textarea
                  className={`${inputs.textarea} min-h-[120px] border-green-500/30 focus:border-green-500/60`}
                  placeholder="How do you move? Gestures, posture, walking style, etc."
                  value={profile.act.bodyMovements.join('\n')}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    act: { ...prev.act, bodyMovements: e.target.value.split('\n').filter(m => m.trim()) }
                  }))}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`${layout.page} ${layout.container} py-16`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-d-text/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-d-text" />
            </div>
            <span className={`${text.eyebrow} text-d-text/60`}>DIGITAL PROFILE</span>
          </div>
          <h1 className={`${text.heroHeading} mb-6`}>
            Build Your Digital Self
          </h1>
          <p className={`${text.body} text-d-white/80 max-w-3xl mx-auto`}>
            Create a comprehensive digital profile by gradually feeding data across four key areas. 
            Each section tracks your progress as you build your complete digital identity.
          </p>
        </div>

        {/* Overall Progress */}
        <div className={`${glass.promptDark} rounded-2xl p-8 mb-8 parallax-mid`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`${text.sectionHeading}`}>Overall Progress</h2>
            <span className="text-d-text font-raleway font-medium text-2xl">{profile.overallProgress}%</span>
          </div>
          <div className="w-full bg-d-dark rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-d-text to-d-light h-3 rounded-full transition-all duration-500"
              style={{ width: `${profile.overallProgress}%` }}
            />
          </div>
          <p className="text-d-white/80 text-sm">
            Complete all four sections to build your comprehensive digital profile
          </p>
        </div>

        {/* Section Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {profile.sections.map((section) => {
            const IconComponent = section.icon;
            const isActive = currentSection === section.id;
            
            return (
              <div
                key={section.id}
                onClick={() => setCurrentSection(section.id)}
                className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 parallax-small ${
                  isActive 
                    ? `${section.bgAccent} ${section.borderAccent} border-2 shadow-lg` 
                    : 'bg-d-black/40 border border-d-dark hover:border-d-mid hover:bg-d-black/60'
                }`}
              >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-2`} />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                      isActive ? `${section.bgAccent} ${section.borderAccent} border` : 'bg-d-mid'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${isActive ? section.accentColor : 'text-d-white'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-raleway font-semibold text-lg ${isActive ? section.accentColor : 'text-d-text'}`}>
                        {section.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 bg-d-dark/50 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${section.gradient}`}
                            style={{ width: `${section.progress}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? section.accentColor : 'text-d-white/70'}`}>
                          {section.progress}%
                        </span>
                      </div>
                    </div>
                    {section.completed && (
                      <div className={`w-8 h-8 rounded-full ${section.bgAccent} flex items-center justify-center`}>
                        <Check className={`w-4 h-4 ${section.accentColor}`} />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-d-white text-sm leading-relaxed mb-4">
                    {section.description}
                  </p>
                  
                  {/* Quest-like indicators */}
                  <div className="space-y-2">
                    {section.id === 'think' && (
                      <div className="flex items-center gap-2 text-xs text-d-white">
                        <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        <span>Beliefs & Values</span>
                      </div>
                    )}
                    {section.id === 'speak' && (
                      <div className="flex items-center gap-2 text-xs text-d-white">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>Voice & Style</span>
                      </div>
                    )}
                    {section.id === 'look' && (
                      <div className="flex items-center gap-2 text-xs text-d-white">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Visual Identity</span>
                      </div>
                    )}
                    {section.id === 'act' && (
                      <div className="flex items-center gap-2 text-xs text-d-white">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span>Behavior Patterns</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section Content */}
        {(() => {
          const currentSectionData = profile.sections.find(s => s.id === currentSection);
          const IconComponent = currentSectionData?.icon;
          
          return (
            <div className={`relative overflow-hidden rounded-2xl p-8 mb-8 parallax-mid ${currentSectionData?.bgAccent} ${currentSectionData?.borderAccent} border`}>
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${currentSectionData?.gradient} opacity-1`} />
              
              {/* Header */}
              <div className="relative z-10 flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 ${currentSectionData?.bgAccent} ${currentSectionData?.borderAccent} border-2 rounded-2xl flex items-center justify-center shadow-lg`}>
                  <IconComponent className={`w-8 h-8 ${currentSectionData?.accentColor}`} />
                </div>
                <div className="flex-1">
                  <h2 className={`${text.sectionHeading} text-d-text mb-2`}>
                    {currentSectionData?.title}
                  </h2>
                  <p className="text-d-white text-base leading-relaxed">
                    {currentSectionData?.description}
                  </p>
                  
                  {/* Progress indicator */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 bg-d-dark/50 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${currentSectionData?.gradient}`}
                        style={{ width: `${currentSectionData?.progress}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${currentSectionData?.accentColor}`}>
                      {currentSectionData?.progress}% Complete
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                {renderSectionContent(currentSection)}
              </div>
            </div>
          );
        })()}

        {/* Generate Digital Copy */}
        <div className="text-center mb-8">
          <button
            onClick={handleGenerateCopy}
            disabled={profile.overallProgress === 0 || isGenerating}
            className={`${buttons.primary} ${
              profile.overallProgress === 0 || isGenerating 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {isGenerating ? (
              <>
                <Zap className="w-5 h-5 animate-spin" />
                Generating Digital Copy...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Generate Digital Copy
              </>
            )}
          </button>
        </div>

        {/* Generated Copy */}
        {generatedCopy && (
          <div className={`${glass.promptDark} rounded-2xl p-8 parallax-mid`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`${text.sectionHeading}`}>Generated Digital Copy</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadCopy}
                  className={`${buttons.ghostCompact} flex items-center gap-2`}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleShareCopy}
                  className={`${buttons.ghostCompact} flex items-center gap-2`}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
            <div className={`${glass.surface} rounded-xl p-6`}>
              <pre className="text-d-white whitespace-pre-wrap font-raleway text-sm leading-relaxed">
                {generatedCopy}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
