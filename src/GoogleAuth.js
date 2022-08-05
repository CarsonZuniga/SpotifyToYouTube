import React from 'react'
import { Button, Container, Row, Col } from 'react-bootstrap';

const credentials = require('./credentials.json');

const YOUTUBE_CLIENT_ID = credentials.YOUTUBE_CLIENT_ID;
const YOUTUBE_API_KEY = credentials.YOUTUBE_API_KEY;

class GoogleAuth extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isSignedIn: null,
            playlistID: "",
            accessToken: ""
        }

        this.onAuthChange = this.onAuthChange.bind(this);
        this.onSignInClick = this.onSignInClick.bind(this);
        this.onSignOutClick = this.onSignOutClick.bind(this);
        this.createPlaylist = this.createPlaylist.bind(this);
        this.deletePlaylist = this.deletePlaylist.bind(this);
        this.addToPlaylist = this.addToPlaylist.bind(this);
        this.getVideoID = this.getVideoID.bind(this);
        this.createPlaylistAndPopulate = this.createPlaylistAndPopulate.bind(this);
    }

    componentDidMount() {
        window.gapi.load('client:auth2',() => {
            window.gapi.client.init({
                clientId: YOUTUBE_CLIENT_ID,
                scope: "https://www.googleapis.com/auth/youtube.force-ssl",
                plugin_name: "SpotifyToYouTube"
            }).then(()=>{
                this.auth = window.gapi.auth2.getAuthInstance();
                this.setState({isSignedIn:this.auth.isSignedIn.get()});
                this.auth.isSignedIn.listen(this.onAuthChange);
            })
        })
    }

    onAuthChange() {
        this.setState({isSignedIn: this.auth.isSignedIn.get()});
        this.setState({accessToken: this.auth.currentUser.get().getAuthResponse().access_token});
    }

    onSignInClick() {
        this.auth.signIn();
    }
    
    onSignOutClick() {
        this.auth.signOut();
    }

    createPlaylist = async () => {
        try {
            var response = await window.gapi.client.request({
                'path': `youtube/v3/playlists?part=snippet&key=${YOUTUBE_API_KEY}`,
                'method': 'POST',
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.state.accessToken
                },
                'body': {
                    "snippet": {
                        "title": this.props.playlistName
                    }
                }
            }).then(response => {
                return response;
            });
            this.setState({playlistID: response.result.id})
        } catch(error) {
            this.onSignOutClick();
            console.log('Error creating playlist');
        }
    }

    deletePlaylist = async () => {
        try {
            var response = await window.gapi.client.request({
                'path': `youtube/v3/playlists?id=${this.state.playlistID}&key=${YOUTUBE_API_KEY}`,
                'method': 'DELETE',
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.state.accessToken
                }
            }).then(response => {
                return response;
            });
            console.log('deleted playlist ', this.state.playlistID);
        } catch(error) {
            console.log('Error deleting playlist ', this.state.playlistID);
        }
        this.setState({playlistID: ""});
    }

    addToPlaylist = async (videoID) => {
        if(this.state.playlistID !== "") {
            try {
                var response = await window.gapi.client.request({
                    'path': `youtube/v3/playlistItems?part=snippet&key=${YOUTUBE_API_KEY}`,
                    'method': 'POST',
                    'headers': {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.state.accessToken
                    },
                    'body': {
                        "snippet": {
                            "playlistId": this.state.playlistID,
                            "resourceId": {
                                "kind": "youtube#video",
                                "videoId": videoID
                            }
                        }
                    }
                });
                return true;
            } catch(error) {
                console.log(`error adding ${videoID} to playlist`);
                return false;
            }
        }
    }

    getVideoID = async (query) => {
        try {
            let maxResults = "1"
            var response = await window.gapi.client.request({
                'path': `youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${query.trim().replaceAll(" ", "%20")}&type=video&key=${YOUTUBE_API_KEY}`,
                'method': 'GET',
                'headers': {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.state.accessToken
                }
            }).then(response => {
                return response;
            })
            return response.result.items[0].id.videoId;
        } catch(error) {
            console.log(`error getting video id for ${query}`)
            return null;
        }
    }

    createPlaylistAndPopulate = async (playlistSongs) => {
        if(playlistSongs.length > 0) {
            await this.createPlaylist();
            for(var i = 0; i < playlistSongs.length; i++) {
                let song = playlistSongs[i];
                let video_id = await this.getVideoID(`${song.name} ${song.artists[0].name}`);
                if(video_id) {
                    let added = await this.addToPlaylist(video_id);
                    console.log(`added ${song.name} to playlist`)
                    if(!added) {
                        console.log(`error adding ${song.name} to playlist`)
                        // this.deletePlaylist();
                        break;
                    }
                }
            }
        }
    }

    render() {
        const renderAuthButton = () => {
            if(this.state.isSignedIn === null) {
                return null
            }
            else if (this.state.isSignedIn) {
                return (
                    <Button onClick={this.onSignOutClick} className="youtube-button">
                        Sign Out of Google
                    </Button>
                );
            }
            else {
                return (
                    <Button onClick={this.onSignInClick} className="youtube-button">
                        Sign In with Google
                    </Button>
                );
            }
        }

        const renderCreatePlaylistButton = () => {
            if(this.state.isSignedIn === null) {
                return null
            }
            else if (this.state.isSignedIn) {
                return (
                    <Button onClick={(e) => {e.preventDefault(); this.createPlaylistAndPopulate(this.props.songs);}} className="youtube-button">
                        Create YouTube Playlist
                    </Button>
                );
            }
        }

        return (
            <Container>
                <Row>
                    {renderAuthButton()}
                    {renderCreatePlaylistButton()}
                </Row>
            </Container>
        );
    }
}

export default GoogleAuth;