proxyZibase
===========

Proxy Zibase concatène les infos disponibles via les differentes API officielles dans un JSON simple.

Utilise un cache pour pouvoir être appelé souvent et répondre rapidement.

Décode le champ zwtab et les ID Zwave (Inspiré de plusieurs sources. Merci).

Fonctionne sur toute plateforme (Windows / Linux / MacOS, ...)

Testé sous Windows et sur Raspberry PI (distrib de base).

# Exemples

Il est possible de passer en paramêtre l'IP locale de la ZiBase afin d'éviter les requetes sur le serveur officiel.
http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e&ip=192.168.1.15

Il y a un cache par défaut de 10 secondes pour les requêtes en ligne et aucun cache pour les requêtes en local.

## Récupérer l'ensemble des périphériques

http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e
```json
[
  {
    "num": "ZA7",
    "name": "ouverture2",
    "type": "transmitter",
    "logo": "logotype_general_red.png",
    "id": 6,
    "actif": 0,
  },
  {
    "num": "OS439191810",
    "name": "Extérieur",
    "type": "temperature",
    "logo": "logotype_temperature.png",
    "id": "439191810",
    "gmt": 1387380938,
    "date": "2013-12-18T15:35:38.000Z",
    "v1": "141",
    "v2": "60"
  }
]
```

## Récupérer un périphérique

http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e&periph=ZA7
ou http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e&periph=ouverture2
```json
{
  "num": "ZA7",
  "name": "ouverture2",
  "type": "transmitter",
  "logo": "logotype_general_red.png",
  "id": 6,
  "actif": 1,
  "alerte": 1,
  "gmt": 1387380886,
  "date": "2013-12-18T15:34:46.000Z"
}
```

## Récupérer une info d'un periphérique
http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e&periph=ZA7&info=actif
```json
1
```

## Supprimer une alerte

http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e&suppAlerte=ZA7

Retourne l'ensemble des périphériques



# Installation


Prérequis : Node JS doit être installé : http://nodejs.org

1. Téléchargez proxyZibase et rendez vous dans le dossiez ou vous avez copié proxyZibase.js
2. Tapez en ligne de commande `npm install` pour installer les packages nécessaires.
3. Tapez en ligne de commande `node proxyZibase.js`. Le message "proxyZibase server start on port 81" doit s'afficher
4. Rendez vous sur votre navigateur préféré et ouvrez http://127.0.0.1:81/?device=ZiBASE00123&token=1a2b3c4d5e en remplaçant par le bon device et le bon token.

