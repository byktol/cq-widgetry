<?xml version="1.0" encoding="UTF-8" ?>
<jsp:root
  xmlns:jsp="http://java.sun.com/JSP/Page"
  xmlns:c="http://java.sun.com/jsp/jstl/core"
  xmlns:fn="http://java.sun.com/jsp/jstl/functions"
  version="2.0">
	<jsp:directive.page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" session="false" trimDirectiveWhitespaces="false" />
  <jsp:directive.include file="/libs/foundation/global.jsp" />

  <jsp:scriptlet>
  <![CDATA[
    request.setAttribute("questions", properties.get("questions", new String[0]));
    request.setAttribute("answers"  , properties.get("answers"  , new String[0]));
  ]]>
  </jsp:scriptlet>

  <h1>Frequently Asked Questions</h1>
  <c:forEach var="i" begin="0" end="${fn:length(questions) - 1}">
    <div>
      <h2>Q: ${questions[i]}</h2>
      <div>
        ${answers[i]}
      </div>
    </div>
  </c:forEach>
</jsp:root>