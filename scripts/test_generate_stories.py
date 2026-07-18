import requests
import json
base='http://127.0.0.1:8000/api/v1'
# create project
r = requests.post(base+'/projects', json={'name':'ra-story-test','description':'test'})
print('create project', r.status_code, r.text)
proj = r.json().get('id')
# sample FRs
frs=[{'id':'FR-01','description':'Users can upload documents','type':'Functional','priority':'High'}]
# call generate-stories
r2 = requests.post(base+'/agents/generate-stories', json={'projectId':proj,'functionalRequirements':frs})
print('generate-stories', r2.status_code)
try:
    print(json.dumps(r2.json(), indent=2))
except Exception:
    print('response text:', r2.text)
