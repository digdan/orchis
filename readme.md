# 🌸 Orchis – Complex Job Orchestration Template

**Orchis** is a powerful, flexible, and customizable job orchestration template to jump-start your background job workflows.  
Built with **JavaScript/Node.js**, it provides a structured foundation for defining, managing, and executing dependent jobs with ease.

---

## 🔍 Overview

Orchis provides a boilerplate structure for building robust job orchestration systems.  
With support for job definition, dependency handling, execution control, and orchestration patterns, it's ideal for complex workflows that need clarity, modularity, and scalability.

---

## ✨ Features

- Clean project structure with separate directories:  
  - `flows/` for workflow definitions  
  - `jobs/` for individual job implementations  
  - `libs/` for shared utilities and helpers  
- Built-in examples and `.env` template for quick start  
- Orchestrator logic handled in `orchestrator.js`  
- Worker process defined via `worker.js`  
- Redis integration supported (via `redis.js`)  
- Clear entry point at `index.js`, powered by `package.json` scripts

---

## 🏗 Architecture

```
├── flows/          # High-level orchestration definitions
├── jobs/           # Individual job handlers
├── libs/           # Shared libraries & helpers
├── .env-example    # Sample environment file
├── index.js        # Program entry point
├── orchestrator.js # Core orchestration logic
├── worker.js       # Job execution engine
├── redis.js        # Redis connection/configuration
└── package.json    # Project metadata & dependencies

````

- **flows/**: Define ordered sequences of jobs with dependencies  
- **jobs/**: Encapsulate job logic—each job is self-contained  
- **orchestrator.js**: Reads workflows, orchestrates job execution, handles retries/errors  
- **worker.js**: Executes jobs, communicates with orchestrator, possibly via Redis  
- **redis.js**: Manages job state, communication, or persistence via Redis  

---

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/digdan/orchis.git
   cd orchis
	```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up your environment**

   * Copy the example configuration:

     ```bash
     cp .env-example .env
     ```
   * Customize `.env` with required variables (e.g., Redis connection, orchestration options).

4. **Run the orchestrator & worker**

   ```bash
   node index.js flows/my-sample-workflow.yaml
   ```

---

## 🛠 Usage

Define your jobs under `jobs/`, e.g., `jobs/sendEmail.js`, exporting a function that performs a job.
Configure flows in `flows/`, indicating order, parallelism, retries:

The orchestrator handles job dispatching and transitions.
The worker executes jobs and reports back.

---

## 📋 Example Workflow

1. **Define Jobs**

   * `jobs/fetchData.js`
   * `jobs/analyzeData.js`
   * `jobs/reportResults.js`

2. **Chain in a Flow**

```
name: MySampleFlow
jobs:
	downloadFile:
		job: fetchData
		dependsOn: []
	processData:
		job: analyzeData
		dependsOn: [downloadFile]
	sendEmail:
		job: reportResults
		dependsOn: [processData]
```


3. **Execution**

```bash
node index.js flows/my-sample-flow.yaml
```

**Output:**

```
fetchData → analyzeData → reportResults
```

4. **Inputs & Outputs**

Job can accept inputs, and can also return results as outputs. Flows can have custom outputs defined for when the flow is ran as a nested job.

```
   name: MySampleFlow
   inputs:
      url:
         label: URL for file to download
         required: true
   jobs:
      downloadFile:
         job: fetchData
         dependsOn: []
         inputs:
            url: ${inputs.url}
      processData:
         job: analyzeData
         dependsOn: [downloadFile]
         inputs:
            file: ${downloadFile.file}
      sendEmail:
         job: reportResults
         dependsOn: [processData]
         inputs:
            email: coworker@myjob.com
            results: ${processData.report}
   ouputs:
      completed: true
      file: ${downloadedFile.file}
```   

5. Iteration

Jobs can be executed in interations over an array

```
   name: MySampleFlow
   inputs:
      url:
         label: URL for file to download
         required: true
   jobs:
      downloadFile:
         job: fetchData
         dependsOn: []
         inputs:
            url: ${inputs.url}
      processData:
         job: analyzeData
         dependsOn: [downloadFile]
         inputs:
            file: ${downloadFile.file}
      sendEmail:
         job: reportResults
         dependsOn: [processData]
         iterate: ${processData.reports}
         input: 
            email: coworker@myjob.com
            reportNumber: ${iterate.index}
            results: ${iterate.item}

   ouputs:
      completed: true
      file: ${downloadedFile.file}
```

---

## 🏗️ Jobs

**chromaOverlay**

Overlay a video on top of another vide. Make a specific color transparent on to top video.

* inputs
   * color - color to make transparent
   * similarity - the degree of simliarity to the color
   * bland - the value for blending the overlays
   * file_a - the bottom video
   * file_b - the top video
* outputs
   * file - the output video

---
**combineListVideos**

Create a single video out of a list of videos to be combined
* inputs
   * listFile - The text file containing a list of files to combine. Created by `writeTextList` job
   * table - the video manipulation directory, defined by `initVideoTable`
* outputs
   * file - path to the output file of combined videos

---
**createSolidVideo**

Create a video of a solid color
* inputs
   * color - color of the solid video
   * width - width of the output video
   * height - height of the output video
   * duration - duration of the video in seconds
   * rate - framerate of the output video
   * table - table to use to create video, defined by `initVideoTable`      
* outputs
   * file - file of the outputed video

---
**download**

download from a URL to the table
* inputs
   * url - url to download from
* outputs
   * file - local file of downloaded file
   * path - an object of parts of the local file path
   * mime - mime type of the download file
   * size - size of the file in bytes

---
**eval**

Evaluates javascript code and returns the result
* inputs
   * code - the code to be evaluated
* outputs
   * result - the result of the evaluated code

---
**fadeVideos**

Crossfade from one video to another
* inputs
   * table - The video table to create the new video with, defined by `initiateVideoTable`
   * type - The type of fade to perform. ( see https://trac.ffmpeg.org/wiki/Xfade#Gallery for examples )
   * start - when to start fade in seconds.
   * duration - duration of fade
   * file_a - starting video of fade
   * file_b - ending video of fade
* outputs
   * file - the local path to the file

---
**getVideoInfo**

Gathers information about a video
* inputs
   * file - local file of video
* outputs
   * file - file that was analyzed
   * duration - duration of the video in seconds
   * duration_ms - duration of video in milliseconds
   * width - width of video
   * height - height of video
   * rate - frame rate of video

---
**imageListVideo**

Combine a list of images into a video
* inputs
   * listFile - file of paths to the images, defined by `writeTextList`
* outputs
   * file - The generated video

---
**initVideoTable**

creates and cleans a subdirectory for working on files
* inputs
   * path - The path for the table directory to be created
* outputs
   * table - The path the table was created at

---
**interleaveArrays**

Convert a 2d array into a 1d interleaved array
* inputs
   * arrays - a 2d array
* outputs
   * interleaved - a 1d array

---
**loopVideo**

Loop a video X amount of times into a new video
* inputs
   * file - the video to loop
   * loops - the number of times to loop it
* outputs
   * file - the output file that is looped

---
**overlayVideos**

Overlay one video over another
* inputs
   * file_a - First video
   * file_b - Second video
   * top - the top offset in pixels
   * left - the left offset in pixels
   * alpha - the amount of transparency between 0 and 1
* outputs
   * file - The output video file

---
**snapBPM**

Find the closest divisible duration at a certain BPM
* intputs
   * BPM - Beats per minute to snap to
   * duration - Original duration in seconds
   * divide - Optional parameter to divide results by 
* outputs
   * closestDuration - Closest duration in seconds that matches an even division into BPM
   * segments - The number of segments (beats) in the output duration
   * segmentDuration - The duration in seconds of each segment

---
**splitVideoSegments**

Split a video file by a certain number and duration of segments
   * input
      * file - The local file to split
      * segments - The number of segments to split into
      * segmentDuration - The length of each segment in seconds
   * output
      * segmentFiles - An array of the local files that video was split into

---      
**stretchVideoDuration**

Copy a video with a new duration, speeding up or slowing down the duration of the video.
* inputs
   * file - The input video to stretch
   * durationFrom - The duration of the input video
   * durationTo - The desired duration of the output video
* outputs
   * file - The stretched output video
   * points - The ratio of duration it was stretched by

---
**writeTextList**

Create a text file of a list of files. Used with `combineListVideos`
* inputs
   * list - Array of files to include in the text file list      
* outputs
   * file - The text file of the list
---

## ⚙ Configuration

Orchis can be customized via `.env`, possibly including:

| Variable      | Description                   | Default     |
| ------------- | ----------------------------- | ----------- |
| `REDIS_URL`   | Redis connection string       | `redis://…` |
| `FFMPEG_PATH` | Used for FFMPEG jobs          | `/usr/bin`  |

---

## 🔧 Customization & Extension

* **Failure Handling**: Add retry logic in job implementations or orchestrator
* **Parallelism**: Extend orchestrator to support parallel branches
* **Persistence**: Store workflow metadata, job results, or state for auditing
* **Monitoring**: Integrate observability tools or dashboards for real-time tracking
* **Scaling**: Run multiple workers across machines; use Redis for synchronized state

---

## 💡 Best Practices

* Keep Jobs Modular: One responsibility per job file
* Descriptive Naming: Job names should clearly describe their action
* Idempotency: Design jobs to be safe if retried
* Logging: Include context-rich logs (flow name, job ID, parameters)
* Graceful Shutdowns: Ensure workers can exit cleanly, respecting ongoing jobs

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repo
2. Create a feature branch

   ```bash
   git checkout -b feature/my-feature
   ```
3. Commit your changes

   ```bash
   git commit -m "Add X feature"
   ```
4. Push to your branch

   ```bash
   git push origin feature/my-feature
   ```
5. Open a Pull Request for review

---

## 📜 License

This project is open source and available under the **MIT License**.

---

## 🌟 Wrapping Up

* Orchis is a strong starting point for building sophisticated job orchestration systems
* The modular structure encourages clarity and extensibility
* Whether you’re chaining simple jobs or implementing complex workflows, this template can be tailored to your needs

```