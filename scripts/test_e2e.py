import requests, tempfile, os
base='http://127.0.0.1:8000/api/v1'
# create project
r = requests.post(base+'/projects', json={'name':'ra-e2e','description':'e2e test'})
print('create project', r.status_code, r.text)
proj = r.json().get('id')
# create temp txt file
tf = tempfile.gettempdir() + os.sep + 'e2e_test_doc.txt'
with open(tf,'w', encoding='utf-8') as f:
    f.write('As a user, I want to upload documents so I can manage files.')
# upload
with open(tf,'rb') as fh:
    files = {'file':('e2e_test_doc.txt', fh)}
    r2 = requests.post(base+f'/documents/upload?projectId={proj}', files=files)
print('upload', r2.status_code, r2.text)
doc = r2.json()
# extract
r3 = requests.post(base+'/agents/extract-requirements', json={'projectId':proj,'documentId':doc['id']})
print('extract', r3.status_code, r3.text)
# generate stories
r4 = requests.post(base+'/agents/generate-stories', json={'projectId':proj,'functionalRequirements': r3.json().get('functional_requirements', [])})
print('generate stories', r4.status_code, r4.text)
# cleanup temp file
try:
    os.remove(tf)
except:
    pass
