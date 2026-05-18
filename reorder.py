import re

with open('d:\\Brenda\\Documentos\\dev\\Proyecto_FIFA_2026\\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start_content = html.find('<div class="content">') + len('<div class="content">')
end_content = html.find('  </div>\n  <footer')

# Wait, the closing div for .content might be indented. Let's find it carefully.
# The content block is <div class="content">...</div> followed by <footer>
# So we can just split on <footer
footer_split = html.split('<footer')
before_footer = footer_split[0]
end_content = before_footer.rfind('</div>') # this should be the closing of <div class="content">

content_html = html[start_content:end_content]

sections = re.split(r'(<div class="section.*?id="sec-[^"]+">)', content_html)
section_dict = {}
for i in range(1, len(sections), 2):
    tag = sections[i]
    content = sections[i+1]
    match = re.search(r'id="sec-([^"]+)"', tag)
    if match:
        id_val = match.group(1)
        section_dict[id_val] = tag + content

order = ['groupes', 'classement', 'scatter', 'h2h', 'palmares', 'simulador', 'pronostics']

new_content = '\n'
for s in order:
    if s in section_dict:
        sec = section_dict[s]
        if s == 'groupes':
            sec = sec.replace('class="section"', 'class="section active"')
        else:
            sec = sec.replace('class="section active"', 'class="section"')
        new_content += sec

new_html = html[:start_content] + new_content + html[end_content:]
with open('d:\\Brenda\\Documentos\\dev\\Proyecto_FIFA_2026\\index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
print("Done")
