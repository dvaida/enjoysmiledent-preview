# The Jekyll stack GitHub Pages builds this site with (github-pages 232 = Jekyll 3.10.0).
# tests/build.mjs expects this image under the tag enjoysmile-jekyll:gh232. Build it once:
#
#   docker build -t enjoysmile-jekyll:gh232 tests
#
# Ruby 4 on the host cannot install github-pages 232, hence the container.
FROM ruby:3.3
RUN gem install github-pages -v 232 --no-document && gem install webrick --no-document
WORKDIR /src
ENTRYPOINT ["jekyll"]
