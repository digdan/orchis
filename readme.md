# Orchis

![Orchis](https://img.favpng.com/2/11/25/orchids-violet-purple-clip-art-png-favpng-Lj5dUnAeCWwm5r9xG1XYyCYAp.jpg =200x)

Using YAML to provide inputs/ouputs in customizable job pipelines

## Example

The media_processing_pipeline.yaml file provided in the repo should provide the following results:

```
1 executing job convert_video ffmpeg -i input.mp4 -vf scale=1280:720 output.mp4
2 executing job extract_audio ffmpeg -i output.mp4 -vn -acodec copy audio.aac
2 executing job generate_thumbnail ffmpeg -i output.mp4 -ss 00:00:05 -vframes 1 thumbnail.jpg
3 executing job upload_results node upload.js audio.aac thumbnail.jpg
```

This is the execution of the following template:

```
job_id: media_processing_pipeline
description: Convert video, extract audio, and generate thumbnail

jobs:
  convert_video:
    command: "ffmpeg -i input.mp4 -vf scale=1280:720 output.mp4"
    depends_on: []
    outputs:
      video: output.mp4

  extract_audio:
    command: "ffmpeg -i {{convert_video.video}} -vn -acodec copy audio.aac"
    depends_on: [convert_video]
    outputs:
      audio: audio.aac

  generate_thumbnail:
    command: "ffmpeg -i {{convert_video.video}} -ss 00:00:05 -vframes 1 thumbnail.jpg"
    depends_on: [convert_video]
    outputs:
      image: thumbnail.jpg

  upload_results:
    command: "node upload.js {{extract_audio.audio}} {{generate_thumbnail.image}}"
    depends_on: [extract_audio, generate_thumbnail]
```

## How it works

Each job is based on a worker queue job that is handled separately from Orchis. You can feed custom inputs into these jobs and map custom outputs outside of these jobs.

Those jobs are represented by a YAML template and given a generic name to be used in a long list of work types

You can then create a YAML "recipe" to connect the generic work types into pipelines that complete specific tasks.
