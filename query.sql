SELECT
  lemme,
  AVG((freqlemfilms2 + freqlemlivres) / 2) AS avg,
  cgram
FROM
  lexique
GROUP BY
  lemme,
  cgram
HAVING
  cgram = 'VER'
ORDER BY
  avg DESC
LIMIT
  10;
