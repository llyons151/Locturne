Pod::Spec.new do |s|
  s.name           = 'PoseCamera'
  s.version        = '1.0.0'
  s.summary        = 'Push-ups: the front camera, MediaPipe body pose (Apple Vision as fallback), and Loc saying the count out loud.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '17.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Google's pose model runtime (2026-11-21): tracks a plank Vision loses. The model is bundled below.
  s.dependency 'MediaPipeTasksVision', '0.10.35'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.frameworks = 'UIKit', 'AVFoundation', 'Vision'
  s.source_files = "**/*.{h,m,swift}"
  # pose_landmarker_full.task, from storage.googleapis.com/mediapipe-models (Apache 2.0).
  s.resource_bundles = { 'PoseCameraModel' => ['models/*.task'] }
end
