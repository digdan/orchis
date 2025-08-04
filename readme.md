# Orchis

Using YAML to provide inputs/ouputs in customizable job pipelines using Mustache Templates.

## Example

```yaml
job_id: testing
description: Perform tests

jobs:
  list_js:
    command: "ls *.js"
    depends_on: []
    outputs:
      checked: js

  list_json:
    command: "ls *.json"
    depends_on: [list_js]
    outputs:
      checked: json

  list_md:
    command: "ls *.md"
    depends_on: [list_js]
    outputs:
      checked: md

  list_all:
    command: "ls *.*"
    depends_on: [list_md, list_json]
    outputs:
      checked: all
  
  create_cat_list:
    command: "echo readme.md"    

  cat_md:
    command: "cat {{# create_cat_list.stdout }}{{ . }}{{/ create_cat_list.stdout }}"
    depends_on: [create_cat_list]
```