#!/usr/bin/env swift

import AppKit
import Foundation
import Vision

enum OcrScriptError: LocalizedError {
  case missingInput
  case fileNotFound(String)
  case unsupportedImage(String)

  var errorDescription: String? {
    switch self {
    case .missingInput:
      return "Usage: ocr-macos-vision.swift <image-path>"
    case .fileNotFound(let filePath):
      return "Image file not found: \(filePath)"
    case .unsupportedImage(let filePath):
      return "Unable to decode image: \(filePath)"
    }
  }
}

func loadImage(at filePath: String) throws -> CGImage {
  guard FileManager.default.fileExists(atPath: filePath) else {
    throw OcrScriptError.fileNotFound(filePath)
  }

  let url = URL(fileURLWithPath: filePath)
  guard
    let image = NSImage(contentsOf: url),
    let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
  else {
    throw OcrScriptError.unsupportedImage(filePath)
  }

  return cgImage
}

func recognizeText(from image: CGImage) throws -> String {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["zh-Hans", "en-US"]

  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  try handler.perform([request])

  let observations = (request.results ?? [])
    .sorted {
      if abs($0.boundingBox.midY - $1.boundingBox.midY) > 0.01 {
        return $0.boundingBox.midY > $1.boundingBox.midY
      }

      return $0.boundingBox.minX < $1.boundingBox.minX
    }

  let lines = observations.compactMap { observation in
    observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines)
  }
  .filter { !$0.isEmpty }

  return lines.joined(separator: "\n")
}

do {
  let arguments = Array(CommandLine.arguments.dropFirst())
  guard let filePath = arguments.first else {
    throw OcrScriptError.missingInput
  }

  let image = try loadImage(at: filePath)
  let text = try recognizeText(from: image)
  FileHandle.standardOutput.write(Data(text.utf8))
} catch {
  let message = (error as? LocalizedError)?.errorDescription ?? String(describing: error)
  FileHandle.standardError.write(Data("\(message)\n".utf8))
  exit(1)
}
