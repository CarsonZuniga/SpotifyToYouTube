import React, {useEffect, useState} from 'react';
import axios from "axios";
import {Container, Row, Col, Button, Form} from "react-bootstrap/";
import GoogleAuth from './GoogleAuth';
  
const credentials = require('./credentials.json');

const SPOTIFY_CLIENT_ID = credentials.SPOTIFY_CLIENT_ID
const SPOTIFY_REDIRECT_URI = credentials.SPOTIFY_REDIRECT_URI
const SPOTIFY_AUTH_ENDPOINT = credentials.SPOTIFY_AUTH_ENDPOINT
const SPOTIFY_RESPONSE_TYPE = credentials.SPOTIFY_RESPONSE_TYPE
const SPOTIFY_API_ENDPOINT = credentials.SPOTIFY_API_ENDPOINT
const SPOTIFY_PLAYLIST_SCOPE = credentials.SPOTIFY_PLAYLIST_SCOPE

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            spotifytoken: "",
            searchKey: "",
            playlistSongs: [],
            playlists: [],
            chosenPlaylistID: "",
            chosenPlaylistName: ""
        }
        this.spotifyLogout = this.spotifyLogout.bind(this);
        this.getPlaylists = this.getPlaylists.bind(this);
        this.getSongsFromPlaylist = this.getSongsFromPlaylist.bind(this);
        
    }

    componentDidMount() {
        const hash = window.location.hash
        let spotifytoken = window.localStorage.getItem("spotifytoken")

        if (!spotifytoken && hash) {
            spotifytoken = hash.substring(1).split("&").find(elem => elem.startsWith("access_token")).split("=")[1]

            window.location.hash = ""
            window.localStorage.setItem("spotifytoken", spotifytoken)
        }

        this.setState({spotifytoken: spotifytoken});
    }

    spotifyLogout() {
        this.setState({spotifytoken: ""})
        window.localStorage.removeItem("spotifytoken")
        window.location.href= SPOTIFY_REDIRECT_URI.replace('/spotify-callback', '');
    }

    getSongsFromPlaylist = async(event) => {
        event.preventDefault()
        try {
            var new_playlist_songs = [];
            let i = 0;
            this.setState({playlistSongs:[]})
            while(true) {
                let {data} = await axios.get(`${SPOTIFY_API_ENDPOINT}/playlists/${this.state.searchKey}/tracks`, {
                    headers: {
                        Authorization: `Bearer ${this.state.spotifytoken}`
                    },
                    params: {
                        'limit': 100,
                        'offset': 100 * i
                    }
                })
                if(data.items.length === 0)
                    break;

                for(var j = 0; j < data.items.length; j++) {
                    new_playlist_songs.push(data.items[j].track);
                }
                i += 1;
            }
            this.setState({playlistSongs: new_playlist_songs})
        } catch(error) {
            alert(`Could not get playlist with ID ${this.state.searchKey}`)
        }
    }

    getPlaylists = async(event) => {
        event.preventDefault()
        try {
            const {data} = await axios.get(`${SPOTIFY_API_ENDPOINT}/me/playlists`, {
                headers: {
                    Authorization: `Bearer ${this.state.spotifytoken}`
                },
                params: {
                    'limit': 50
                }
            })    
            this.setState({playlists: data.items});
        } catch(error) {
            alert('Could not get your playlists');
        }
    }


    render() {
        const renderSpotifyLoginButton = () => {
            if(this.state.spotifytoken) {
                return (<Button className="spotify-button" onClick={this.spotifyLogout}>Logout of Spotify</Button>);
            }
            else {
                return (<Button className="spotify-button" onClick={() => window.location.href=`${SPOTIFY_AUTH_ENDPOINT}?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${SPOTIFY_REDIRECT_URI}&response_type=${SPOTIFY_RESPONSE_TYPE}&scope=${SPOTIFY_PLAYLIST_SCOPE}`}>Login to Spotify</Button>);
            }
        }
        const renderGetPlaylistsButton = () => {
            if(this.state.spotifytoken) {
                return (<Button onClick={this.getPlaylists} className="spotify-button">Get All Playlists</Button>);
            }
            else {
                return null;
            }
        }
        const renderPlaylists = () => {
            if(this.state.playlists.length && this.state.spotifytoken) {
                return (
                    <Container>
                        <Form onSubmit={(e) => {e.preventDefault();}}>
                            Please Select Your Playlist
                            {this.state.playlists.map(playlist => (
                                <div key={playlist.id} className="playlist">
                                    <Form.Check type="radio" id={playlist.id} label={playlist.name} value={playlist.name} name="chosen_playlist" onChange={(e) => {this.setState({chosenPlaylistID: e.target.id}); this.setState({chosenPlaylistName: e.target.value})}}/>
                                </div>
                            ))}
                        </Form>
                    </Container>
                );
            }
            else {
                return (<Container></Container>);
            }
        }
        const renderSearchBar = () => {
            return (
                <Container>
                    {this.state.chosenPlaylistName ? <Row>Chosen Playlist Name: {this.state.chosenPlaylistName}</Row> : <></>}
                    {this.state.chosenPlaylistID ? <Row>Chosen Playlist ID: {this.state.chosenPlaylistID}</Row> : <></>}
                    <Row>
                        <Form onSubmit={this.getSongsFromPlaylist} id="search-bar">
                            <p>Enter Playlist ID:</p>
                            <Form.Control type="sm" onChange={e => this.setState({searchKey: e.target.value})} placeholder={this.state.chosenPlaylistID ? "Try copying the above ID. ^" : "Copy your playlist ID here."}/>
                            <Button type="submit">Search</Button>
                        </Form>
                    </Row>
                </Container>
            );
        }
        const renderPlaylistSongs = () => {
            if(this.state.playlistSongs.length > 0) {
                return (
                    <Container id="song-list">
                        <p>Your songs:</p>
                        {this.state.playlistSongs.map(song => (
                        <Container className="songContainer" key={song.id}>
                            <Row>
                                <Col md={4}>
                                    {song.album.images[0].url ? <img width={"50%"} src={song.album.images[0].url } alt={song.album.name}/> : <>No Image</>}
                                </Col>
                                <Col md={8}>
                                    <Row><p className="song-title">"{song.name}" by {song.artists[0].name}</p></Row>
                                    <Row><a href={`https://www.youtube.com/results?search_query=${song.name}+${song.artists[0].name}`} target="_blank">Search on YouTube</a></Row>
                                </Col>
                            </Row>
                        </Container>
                        ))}
                    </Container>
                );
            }
            else {
                return (<Container></Container>);
            }
        }

        return (
            <div className="App">
                <header className="App-header">
                    <img src="images/logo.png" width="10%"/>
                    <h1>SpotifyToYouTube</h1>
                    <Container>
                        <Row>
                            <Col md={6}>
                                <Row>
                                    {renderSpotifyLoginButton()}
                                    {renderGetPlaylistsButton()}
                                </Row>
                            </Col>
                            <Col md={6}>
                                <GoogleAuth songs={this.state.playlistSongs} playlistName={this.state.chosenPlaylistName}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                
                                {renderPlaylists()}
                            </Col>
                            <Col>
                                {renderSearchBar()}
                                {renderPlaylistSongs()}
                            </Col>
                        </Row>
                    </Container>
                </header>
            </div>
        );
    }
}

export default App;
