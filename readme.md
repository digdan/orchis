# Orchis

Using YAML to provide inputs/ouputs in customizable job pipelines

## Example

The test.yaml file provided in the repo should provide the following results:

```
1 executing job convert_video ffmpeg -i input.mp4 -vf scale=1280:720 output.mp4
2 executing job extract_audio ffmpeg -i output.mp4 -vn -acodec copy audio.aac
2 executing job generate_thumbnail ffmpeg -i output.mp4 -ss 00:00:05 -vframes 1 thumbnail.jpg
3 executing job upload_results node upload.js audio.aac thumbnail.jpg
```